/**
 * Minimal type declaration for @novnc/novnc RFB class.
 * The package does not ship TypeScript types.
 */
declare module '@novnc/novnc/lib/rfb.js' {
  export interface RFBOptions {
    credentials?: { password?: string; username?: string; target?: string }
    shared?: boolean
    repeaterID?: string
    wsProtocols?: string[]
  }

  export interface RFBDisconnectDetail {
    clean: boolean
    reason?: string
    code?: number
  }

  export default class RFB {
    constructor(target: HTMLElement, url: string, options?: RFBOptions)

    /** Scale viewport to fit in target element if true */
    scaleViewport: boolean
    /** Request server resize when viewport changes if true */
    resizeSession: boolean
    /** Focus keyboard events on noVNC canvas if true */
    focusOnClick: boolean
    /** Show cursor (local rendering) */
    showDotCursor: boolean
    /** Use clipboard transfer */
    clipboardDown: boolean
    clipboardUp: boolean
    clipboardSeamless: boolean

    addEventListener(type: 'connect', listener: (event: CustomEvent) => void): void
    addEventListener(
      type: 'disconnect',
      listener: (event: CustomEvent<RFBDisconnectDetail>) => void,
    ): void
    addEventListener(type: 'credentialsrequired', listener: (event: CustomEvent) => void): void
    addEventListener(type: 'securityfailure', listener: (event: CustomEvent) => void): void
    addEventListener(type: 'clipboard', listener: (event: CustomEvent<{ text: string }>) => void): void
    addEventListener(type: string, listener: (event: CustomEvent) => void): void

    removeEventListener(type: string, listener: (event: CustomEvent) => void): void

    /** Send credentials to the server after 'credentialsrequired' event */
    sendCredentials(credentials: { password?: string; username?: string; target?: string }): void

    /** Disconnect from the server */
    disconnect(): void

    /** Send Ctrl+Alt+Del key sequence */
    sendCtrlAltDel(): void

    /** Clipboard operations */
    clipboardPasteFrom(text: string): void

    /** Take a screenshot of the canvas */
    toDataURL(type?: string, encoderOptions?: number): string

    /** Get the WebSocket object */
    readonly capabilities: {
      power?: boolean
      credentials?: boolean
      clipboard?: boolean
    }
  }
}
