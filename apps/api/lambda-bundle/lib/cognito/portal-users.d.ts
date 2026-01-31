/**
 * Portal user provisioning via Cognito AdminCreateUser.
 *
 * Creates a Cognito user with a temporary password and returns the Cognito sub.
 * Intended for admin-only provisioning of portal users.
 */
interface PortalCognitoConfig {
    userPoolId: string;
}
export interface CreatePortalUserInput {
    email: string;
    name: string;
    tempPassword?: string;
}
export interface CreatePortalUserResult {
    cognitoSub: string;
    username: string;
}
export declare function generateTemporaryPassword(length?: number): string;
export declare function resolvePortalCognitoConfig(): PortalCognitoConfig;
export declare function createPortalUser(input: CreatePortalUserInput): Promise<CreatePortalUserResult>;
export {};
