export interface RfcBodyParseResult {
    valid: boolean;
    missingFields: string[];
    presentFields: string[];
}
export declare function parseRfcBody(body: string): RfcBodyParseResult;
//# sourceMappingURL=bodyParser.d.ts.map