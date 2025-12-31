declare const LOGO_URL = "https://survivor.realitygamesfantasyleague.com/logo.png";
declare const BASE_URL: string;
declare const COLORS: {
    outerBg: string;
    logoBg: string;
    contentBg: string;
    footerBg: string;
    cardBg: string;
    headingText: string;
    bodyText: string;
    mutedText: string;
    burgundy: string;
    darkBurgundy: string;
    gold: string;
    darkGold: string;
    green: string;
    lightGreen: string;
    red: string;
    borderLight: string;
    borderMedium: string;
};
export type EmailTheme = 'default' | 'tribal' | 'immunity' | 'tribal_council' | 'merge';
export declare function emailWrapper(content: string, preheader?: string, theme?: EmailTheme): string;
export declare function heading(text: string, level?: 1 | 2 | 3, color?: 'burgundy' | 'gold' | 'error' | 'green'): string;
export declare function paragraph(text: string, muted?: boolean): string;
export declare function highlight(text: string, color?: 'burgundy' | 'gold' | 'green'): string;
export declare function button(text: string, url: string, variant?: 'primary' | 'urgent' | 'gold' | 'success'): string;
export declare function card(content: string, variant?: 'default' | 'warning' | 'success' | 'error' | 'immunity' | 'highlight'): string;
export declare function statBox(value: string | number, label: string, color?: 'burgundy' | 'gold' | 'dark' | 'green' | 'red'): string;
export declare function statsRow(stats: Array<{
    value: string | number;
    label: string;
    color?: 'burgundy' | 'gold' | 'dark' | 'green' | 'red';
}>): string;
export declare function featureItem(emoji: string, title: string, description: string): string;
export declare function listItem(text: string, icon?: string): string;
export declare function divider(): string;
export declare function spacer(height?: number): string;
export declare function centeredText(content: string): string;
export declare function badge(text: string, color?: 'burgundy' | 'gold' | 'green' | 'red'): string;
export declare function formatDate(date: Date, options?: {
    includeTime?: boolean;
}): string;
export { LOGO_URL, BASE_URL, COLORS };
//# sourceMappingURL=base.d.ts.map