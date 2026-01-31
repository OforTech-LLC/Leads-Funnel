/**
 * AI Lead Analyzer
 *
 * Uses an LLM to analyze lead content for urgency, intent, and language.
 * Falls back to heuristic analysis if the LLM is disabled or unavailable.
 */
import { isFeatureEnabled } from '../feature-flags';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { createRequire } from 'node:module';
import { createLogger } from '../logging';
const log = createLogger('ai-analyzer');
const require = createRequire(import.meta.url);
const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_MAX_TOKENS = 256;
const DEFAULT_TEMPERATURE = 0.2;
const MAX_INPUT_CHARS = 4000;
const URGENCY_VALUES = ['high', 'medium', 'low'];
const INTENT_VALUES = [
    'info_gathering',
    'ready_to_buy',
    'complaint',
    'other',
];
function detectProvider(modelId) {
    if (modelId.startsWith('anthropic.'))
        return 'anthropic';
    if (modelId.startsWith('amazon.titan'))
        return 'titan';
    return 'unknown';
}
function buildPrompt(text) {
    return [
        'You are a lead analysis engine.',
        'Analyze the lead text and return a JSON object with keys:',
        'urgency (high|medium|low), intent (ready_to_buy|info_gathering|complaint|other),',
        'language (ISO 639-1), summary (short sentence).',
        'Respond with JSON only.',
        '',
        'Lead text:',
        text,
    ].join('\n');
}
function extractJson(text) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start)
        return null;
    return text.slice(start, end + 1);
}
function normalizeAnalysis(raw) {
    if (!raw || typeof raw !== 'object')
        return null;
    const record = raw;
    const urgencyRaw = typeof record.urgency === 'string' ? record.urgency.toLowerCase() : 'low';
    const intentRaw = typeof record.intent === 'string' ? record.intent.toLowerCase() : 'other';
    const languageRaw = typeof record.language === 'string' ? record.language.toLowerCase() : 'en';
    const summaryRaw = typeof record.summary === 'string' ? record.summary.trim() : '';
    const urgency = URGENCY_VALUES.includes(urgencyRaw)
        ? urgencyRaw
        : 'low';
    const intent = INTENT_VALUES.includes(intentRaw)
        ? intentRaw
        : 'other';
    const summary = summaryRaw || `Auto-generated summary: ${intent.replace(/_/g, ' ')}`;
    return {
        urgency,
        intent,
        language: languageRaw || 'en',
        summary: summary.slice(0, 240),
    };
}
function heuristicAnalysis(text) {
    const lowerText = text.toLowerCase();
    let urgency = 'low';
    if (lowerText.match(/(asap|urgent|immediately|now|emergency)/)) {
        urgency = 'high';
    }
    else if (lowerText.match(/(soon|interested|question)/)) {
        urgency = 'medium';
    }
    let intent = 'info_gathering';
    if (lowerText.match(/(buy|purchase|quote|price|cost|hire)/)) {
        intent = 'ready_to_buy';
    }
    else if (lowerText.match(/(complain|issue|problem|broken|bad)/)) {
        intent = 'complaint';
    }
    const language = lowerText.match(/(hola|gracias|favor|necesito)/) ? 'es' : 'en';
    return {
        urgency,
        intent,
        language,
        summary: `Auto-generated summary: User is interested in ${intent.replace(/_/g, ' ')} with ${urgency} urgency.`,
    };
}
function resolveBedrockConfig() {
    const modelId = process.env.BEDROCK_MODEL_ID?.trim();
    if (!modelId)
        return null;
    const region = process.env.BEDROCK_REGION || process.env.AWS_REGION || 'us-east-1';
    const timeoutMs = Number.parseInt(process.env.BEDROCK_TIMEOUT_MS || '', 10);
    const maxRetries = Number.parseInt(process.env.BEDROCK_MAX_RETRIES || '', 10);
    const maxTokens = Number.parseInt(process.env.BEDROCK_MAX_TOKENS || '', 10);
    const temperature = Number.parseFloat(process.env.BEDROCK_TEMPERATURE || '');
    return {
        modelId,
        region,
        timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : DEFAULT_TIMEOUT_MS,
        maxRetries: Number.isFinite(maxRetries) ? maxRetries : DEFAULT_MAX_RETRIES,
        maxTokens: Number.isFinite(maxTokens) ? maxTokens : DEFAULT_MAX_TOKENS,
        temperature: Number.isFinite(temperature) ? temperature : DEFAULT_TEMPERATURE,
    };
}
let bedrockClient = null;
let bedrockRuntimeModule = null;
function loadBedrockRuntime() {
    if (bedrockRuntimeModule)
        return bedrockRuntimeModule;
    try {
        bedrockRuntimeModule = require('@aws-sdk/client-bedrock-runtime');
        return bedrockRuntimeModule;
    }
    catch (error) {
        log.warn('Bedrock runtime not available', {
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        return null;
    }
}
function getBedrockClient(region, timeoutMs) {
    if (bedrockClient)
        return bedrockClient;
    const runtime = loadBedrockRuntime();
    if (!runtime)
        return null;
    bedrockClient = new runtime.BedrockRuntimeClient({
        region,
        requestHandler: new NodeHttpHandler({
            connectionTimeout: timeoutMs,
            socketTimeout: timeoutMs,
        }),
    });
    return bedrockClient;
}
function shouldRetry(error) {
    if (!error || typeof error !== 'object')
        return false;
    const err = error;
    const status = err.$metadata?.httpStatusCode ?? 0;
    const name = err.name || '';
    return (status >= 500 ||
        status === 429 ||
        name === 'ThrottlingException' ||
        name === 'ServiceUnavailableException' ||
        name === 'TimeoutError');
}
async function invokeBedrock(prompt) {
    const config = resolveBedrockConfig();
    if (!config) {
        log.info('Bedrock analysis skipped (model not configured)');
        return null;
    }
    const provider = detectProvider(config.modelId);
    if (provider === 'unknown') {
        log.warn('Bedrock analysis skipped (unsupported model)', { modelId: config.modelId });
        return null;
    }
    const client = getBedrockClient(config.region, config.timeoutMs);
    const runtime = loadBedrockRuntime();
    if (!client || !runtime) {
        return null;
    }
    const body = provider === 'anthropic'
        ? JSON.stringify({
            anthropic_version: 'bedrock-2023-05-31',
            max_tokens: config.maxTokens,
            temperature: config.temperature,
            messages: [{ role: 'user', content: prompt }],
        })
        : JSON.stringify({
            inputText: prompt,
            textGenerationConfig: {
                maxTokenCount: config.maxTokens,
                temperature: config.temperature,
                topP: 0.9,
            },
        });
    const command = new runtime.InvokeModelCommand({
        modelId: config.modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body,
    });
    for (let attempt = 0; attempt <= config.maxRetries; attempt += 1) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), config.timeoutMs);
        try {
            const response = await client.send(command, { abortSignal: controller.signal });
            clearTimeout(timer);
            const decoded = new TextDecoder().decode(response.body);
            return decoded;
        }
        catch (error) {
            clearTimeout(timer);
            if (attempt >= config.maxRetries || !shouldRetry(error)) {
                throw error;
            }
            const backoff = 200 * Math.pow(2, attempt);
            const jitter = Math.random() * 100;
            await new Promise((resolve) => setTimeout(resolve, backoff + jitter));
        }
    }
    return null;
}
/**
 * Analyze a lead's content to determine urgency and intent.
 *
 * @param text - The full text content of the lead (message, notes, etc.)
 * @returns Analysis result or null if feature is disabled or analysis fails
 */
export async function analyzeLead(text) {
    // Check feature flag first
    const enabled = await isFeatureEnabled('enable_ai_analysis');
    if (!enabled) {
        log.info('AI analysis skipped (feature disabled)');
        return null;
    }
    if (!text || text.trim().length === 0) {
        log.info('AI analysis skipped (empty text)');
        return null;
    }
    const trimmed = text.trim().slice(0, MAX_INPUT_CHARS);
    const bedrockEnabled = await isFeatureEnabled('enable_bedrock_ai');
    try {
        log.info('Starting AI analysis', { textLength: trimmed.length, bedrockEnabled });
        if (bedrockEnabled) {
            const prompt = buildPrompt(trimmed);
            const raw = await invokeBedrock(prompt);
            if (raw) {
                const extracted = extractJson(raw);
                if (extracted) {
                    const parsed = normalizeAnalysis(JSON.parse(extracted));
                    if (parsed) {
                        log.info('AI analysis complete (bedrock)', { urgency: parsed.urgency });
                        return parsed;
                    }
                }
            }
        }
        const fallback = heuristicAnalysis(trimmed);
        log.info('AI analysis complete (heuristic)', { urgency: fallback.urgency });
        return fallback;
    }
    catch (error) {
        log.error('AI analysis failed', {
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        return heuristicAnalysis(trimmed);
    }
}
//# sourceMappingURL=analyzer.js.map