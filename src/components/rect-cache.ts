export interface RectCache {
    /** The most recently measured bounding rect of the element. */
    readonly current: DOMRect;
    /** Stop observing and release all listeners. */
    destroy: () => void;
}

/**
 * Cache an element's bounding rect so high-frequency handlers (e.g. pointermove)
 * can read it without forcing a layout recalculation on every event. The rect is
 * re-measured on scroll (from any container), viewport resize, and element resize.
 */
export function createRectCache(element: HTMLElement): RectCache {
    let rect = element.getBoundingClientRect();
    let frame = 0;

    const measure = () => {
        frame = 0;
        rect = element.getBoundingClientRect();
    };

    const schedule = () => {
        if (frame !== 0) return;
        frame = requestAnimationFrame(measure);
    };

    const resizeObserver =
        typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
    resizeObserver?.observe(element);

    window.addEventListener("scroll", schedule, { passive: true, capture: true });
    window.addEventListener("resize", schedule, { passive: true });

    return {
        get current() {
            return rect;
        },
        destroy() {
            if (frame !== 0) cancelAnimationFrame(frame);
            frame = 0;
            resizeObserver?.disconnect();
            window.removeEventListener("scroll", schedule, { capture: true });
            window.removeEventListener("resize", schedule);
        },
    };
}
