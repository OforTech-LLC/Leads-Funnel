import { describe, it, expect, vi, afterEach } from 'vitest';
const mockIsFeatureEnabled = vi.fn();
vi.mock('../lib/feature-flags.js', () => ({
    isFeatureEnabled: mockIsFeatureEnabled,
}));
async function loadAnalyzer() {
    vi.resetModules();
    return import('../lib/ai/analyzer.js');
}
afterEach(() => {
    mockIsFeatureEnabled.mockReset();
});
describe('analyzeLead', () => {
    it('returns null when feature flag is disabled', async () => {
        mockIsFeatureEnabled.mockResolvedValue(false);
        const { analyzeLead } = await loadAnalyzer();
        const result = await analyzeLead('Need help ASAP');
        expect(result).toBeNull();
    });
    it('returns heuristic analysis when bedrock is disabled', async () => {
        mockIsFeatureEnabled.mockImplementation(async (flag) => flag === 'enable_ai_analysis');
        const { analyzeLead } = await loadAnalyzer();
        const result = await analyzeLead('Need a quote ASAP for roof repair');
        expect(result).not.toBeNull();
        expect(result?.urgency).toBe('high');
        expect(result?.intent).toBe('ready_to_buy');
    });
    it('skips analysis when text is empty', async () => {
        mockIsFeatureEnabled.mockResolvedValue(true);
        const { analyzeLead } = await loadAnalyzer();
        const result = await analyzeLead('   ');
        expect(result).toBeNull();
    });
});
//# sourceMappingURL=ai-analyzer.test.js.map