/**
 * DynamoDB operations for Users
 *
 * Single-table access patterns:
 *   PK = USER#<userId>   SK = META
 *   GSI1PK = EMAIL#<email>  GSI1SK = META       (lookup by email)
 *   GSI2PK = COGNITOSUB#<sub> GSI2SK = META     (lookup by Cognito sub)
 *   GSI3PK = USERS        GSI3SK = CREATED#<iso> (paginated list)
 */
export interface User {
    pk: string;
    sk: string;
    userId: string;
    cognitoSub?: string;
    email: string;
    name: string;
    nameLower?: string;
    status: UserStatus;
    phone?: string;
    avatarUrl?: string;
    preferences: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string;
    gsi1pk: string;
    gsi1sk: string;
    gsi2pk?: string;
    gsi2sk?: string;
    gsi3pk: string;
    gsi3sk: string;
}
export type UserStatus = 'active' | 'inactive' | 'invited';
export interface CreateUserInput {
    email: string;
    name: string;
    cognitoSub?: string;
    status?: UserStatus;
    phone?: string;
    avatarUrl?: string;
    preferences?: Record<string, unknown>;
}
export interface UpdateUserInput {
    userId: string;
    email?: string;
    name?: string;
    cognitoSub?: string;
    status?: UserStatus;
    phone?: string;
    avatarUrl?: string;
    preferences?: Record<string, unknown>;
}
export declare function createUser(input: CreateUserInput): Promise<User>;
export declare function getUser(userId: string): Promise<User | null>;
export declare function getUserByEmail(email: string): Promise<User | null>;
export declare function getUserByCognitoSub(cognitoSub: string): Promise<User | null>;
export declare function updateUser(input: UpdateUserInput): Promise<User>;
export declare function softDeleteUser(userId: string): Promise<void>;
export interface PaginatedUsers {
    items: User[];
    nextCursor?: string;
}
export interface ListUsersInput {
    cursor?: string;
    limit?: number;
    search?: string;
    status?: UserStatus;
}
export declare function listUsers(input?: ListUsersInput): Promise<PaginatedUsers>;
