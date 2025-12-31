interface EnvValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}
export declare function validateEnvironment(): EnvValidationResult;
export declare function printValidationReport(result: EnvValidationResult): void;
export {};
//# sourceMappingURL=validateEnv.d.ts.map