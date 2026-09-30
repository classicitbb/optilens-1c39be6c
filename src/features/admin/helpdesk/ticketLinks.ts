/** Search param that opens the ticket editor modal over whatever admin page is showing. */
export const TICKET_PARAM = "ticket";

/** Relative link that opens a ticket in the editor modal on the current admin page. */
export const ticketHref = (ticketId: string) => `?${TICKET_PARAM}=${encodeURIComponent(ticketId)}`;
