/**
 * Portal user provisioning via Cognito AdminCreateUser.
 *
 * Creates a Cognito user with a temporary password and returns the Cognito sub.
 * Intended for admin-only provisioning of portal users.
 */
import crypto from 'node:crypto';
import { AdminCreateUserCommand, } from '@aws-sdk/client-cognito-identity-provider';
import { getCognitoClient } from '../clients.js';
const PASSWORD_LENGTH = 14;
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghijkmnopqrstuvwxyz';
const NUM = '23456789';
const SPECIAL = '!@#$%^&*_-+=';
const ALL = `${UPPER}${LOWER}${NUM}${SPECIAL}`;
function randomChar(chars) {
    const byte = crypto.randomBytes(1)[0];
    return chars[byte % chars.length];
}
function shuffle(value) {
    const chars = value.split('');
    for (let i = chars.length - 1; i > 0; i--) {
        const j = crypto.randomBytes(1)[0] % (i + 1);
        [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    return chars.join('');
}
export function generateTemporaryPassword(length = PASSWORD_LENGTH) {
    const base = [randomChar(UPPER), randomChar(LOWER), randomChar(NUM), randomChar(SPECIAL)];
    const remaining = Math.max(length - base.length, 0);
    for (let i = 0; i < remaining; i++) {
        base.push(randomChar(ALL));
    }
    return shuffle(base.join(''));
}
function splitName(fullName) {
    const trimmed = fullName.trim();
    if (!trimmed)
        return { givenName: '', familyName: '' };
    const parts = trimmed.split(/\s+/);
    if (parts.length === 1)
        return { givenName: parts[0], familyName: '' };
    return { givenName: parts[0], familyName: parts.slice(1).join(' ') };
}
export function resolvePortalCognitoConfig() {
    const userPoolId = process.env.PORTAL_COGNITO_POOL_ID || '';
    return { userPoolId };
}
function buildAttributes(email, name) {
    const { givenName, familyName } = splitName(name);
    const attrs = [
        { Name: 'email', Value: email },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'name', Value: name },
    ];
    if (givenName)
        attrs.push({ Name: 'given_name', Value: givenName });
    if (familyName)
        attrs.push({ Name: 'family_name', Value: familyName });
    return attrs;
}
export async function createPortalUser(input) {
    const config = resolvePortalCognitoConfig();
    if (!config.userPoolId) {
        throw new Error('Portal Cognito user pool is not configured');
    }
    const client = getCognitoClient();
    const email = input.email.toLowerCase().trim();
    const tempPassword = input.tempPassword || generateTemporaryPassword();
    const command = new AdminCreateUserCommand({
        UserPoolId: config.userPoolId,
        Username: email,
        TemporaryPassword: tempPassword,
        UserAttributes: buildAttributes(email, input.name),
        DesiredDeliveryMediums: ['EMAIL'],
    });
    const response = await client.send(command);
    const attributes = (response.User?.Attributes || []);
    const sub = attributes.find((attr) => attr.Name === 'sub')?.Value;
    if (!sub) {
        throw new Error('Cognito user created but missing sub');
    }
    return { cognitoSub: sub, username: email };
}
//# sourceMappingURL=portal-users.js.map