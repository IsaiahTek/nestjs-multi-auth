/**
 * Parses a duration string (e.g., '15m', '7d', '1h', '30s') or number into seconds.
 * 
 * @param duration The duration string or number of seconds.
 * @param defaultSeconds The default value if parsing fails.
 * @returns The duration in seconds.
 */
export function parseDuration(duration: string | number | undefined, defaultSeconds: number): number {
    if (typeof duration === 'number') return duration;
    if (!duration) return defaultSeconds;

    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return defaultSeconds;

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
        case 's': return value;
        case 'm': return value * 60;
        case 'h': return value * 60 * 60;
        case 'd': return value * 60 * 60 * 24;
        default: return defaultSeconds;
    }
}
