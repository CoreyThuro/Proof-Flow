export type CheckFailureReason = 'no_rfc_linked' | 'rfc_not_approved' | 'attribution_missing' | 'below_threshold_warning';
interface MessageContext {
    rfcNumbers?: number[];
    rfcStates?: string[];
    missingAttributionFiles?: string[];
    template?: string;
}
export declare function buildCheckMessage(reason: CheckFailureReason, ctx?: MessageContext): {
    title: string;
    summary: string;
    details: string;
};
export {};
//# sourceMappingURL=messages.d.ts.map