// Partial typing for the jQueryUI library, version 1.8.x

interface DraggableEventUIParam {
    helper: JQuery;
    position: { top: number; left: number; };
    offset: { top: number; left: number; };
}

interface DraggableEvent {
    (event: Event, ui: DraggableEventUIParam): void;
}

interface Draggable {
    // Options
    disabled?: boolean;
    addClasses?: boolean;
    appendTo?: any;
    axis?: string;
    cancel?: string;
    connectToSortable?: string;
    containment?: any;
    cursor?: string;
    cursorAt?: any;
    delay?: number;
    distance?: number;
    grid?: number[];
    handle?: any;
    helper?: any;
    iframeFix?: any;
    opacity?: number;
    refreshPositions?: boolean;
    revert?: any;
    revertDuration?: number;
    scope?: string;
    scroll?: boolean;
    scrollSensitivity?: number;
    scrollSpeed?: number;
    snap?: any;
    snapMode?: string;
    snapTolerance?: number;
    stack?: string;
    zIndex?: number;
    // Events
    create?: DraggableEvent;
    start?: DraggableEvent;
    drag?: DraggableEvent;
    stop?: DraggableEvent;
}

interface DroppableEventUIParam {
    draggable: JQuery;
    helper: JQuery;
    position: { top: number; left: number; };
    offset: { top: number; left: number; };
}

interface DroppableEvent {
    (event: Event, ui: DroppableEventUIParam): void;
}

interface Droppable {
    // Options
    disabled?: boolean;
    accept?: any;
    activeClass?: string;
    greedy?: boolean;
    hoverClass?: string;
    scope?: string;
    tolerance?: string;
    // Events
    create?: DroppableEvent;
    activate?: DroppableEvent;
    deactivate?: DroppableEvent;
    over?: DroppableEvent;
    out?: DroppableEvent;
    drop?: DroppableEvent;
}

interface ResizableEvent {
    (event: Event, ui: DroppableEventUIParam): void;
}

interface Resizable {
    // Options
    alsoResize?: string;
    animate?: boolean;
    animateDuration?: number | string;
    animateEasing?: string;
    aspectRatio?: boolean | number;
    autoHide?: boolean;
    cancel?: string;
    classes?: Object;
    containment?: Element | string;
    delay?: number;
    disabled?: boolean;
    distance?: number;
    ghost?: boolean;
    grid?: Array<number>;
    handles?: string | Object;
    helper?: string;
    maxHeight?: number;
    maxWidth?: number;
    minHeight?: number;
    minWidth?: number;

    // Methods
    destroy?(): JQuery;
    disable?(): JQuery;
    enable?(): JQuery;
    instance?(): Object;
    option?(): any;
    option?(optionName: string): Object;
    option?(optionName: string, value: Object): JQuery;
    option?(options: Object): JQuery;
    widget?(): JQuery;

    // Events
    create?: ResizableEvent;
    activate?: ResizableEvent;
    deactivate?: ResizableEvent;
    over?: ResizableEvent;
    out?: ResizableEvent;
    drop?: ResizableEvent;
}

interface Sortable {
    // Options
    appendTo?: JQuery | Element | String;
    axis?: String;
    cancel?: String;
    classes?: Object;
    connectWith?: String;
    containment?: Element | string;
    cursor?: string;
    cursorAt?: string;
    delay?: number;
    disabled?: boolean;
    distance?: number;
    dropOnEmpty?: boolean;
    forceHelperSize?: boolean;
    forcePlaceholderSize?: boolean;
    grid?: Array<number>;
    handle?: string | Element;
    helper?: string;
    items?: String;
    opacity?: number;
    placeholder?: String;
    revert?: boolean | number;
    scroll?: boolean;
    scrollSensitivity?: number;
    scrollSpeed?: number;
    tolerance?: string;
    zIndex?: number;

    // Methods
    destroy?(): JQuery;
    disable?(): JQuery;
    enable?(): JQuery;
    instance?(): Object;
    option?(): any;
    option?(optionName: string): Object;
    option?(optionName: string, value: Object): JQuery;
    option?(options: Object): JQuery;
    widget?(): JQuery;

    // Events
    create?: ResizableEvent;
    activate?: ResizableEvent;
    deactivate?: ResizableEvent;
    over?: ResizableEvent;
    out?: ResizableEvent;
    drop?: ResizableEvent;
}

interface Accordion {
    // Options
    active?: Boolean | number;
    animate?: Boolean | Number | String | Object;
    classes?: Object;
    collapsible?: boolean;
    disabled?: boolean;
    event?: string;
    header?: String;
    heightStyle?: String;
    icons?: any;

    // Methods
    destroy?(): JQuery;
    disable?(): JQuery;
    enable?(): JQuery;
    instance?(): Object;
    option?(): any;
    option?(optionName: string): Object;
    option?(optionName: string, value: Object): JQuery;
    option?(options: Object): JQuery;
    refresh?(): JQuery;
    widget?(): JQuery;

    // Events
    activate?: ResizableEvent;
    create?: ResizableEvent;
}

interface JQuery {
    // draggable
    draggable(options: Draggable): JQuery;
    draggable(optionLiteral: string, options: Draggable): JQuery;
    draggable(optionLiteral: string, optionName: string, optionValue: any): JQuery;
    draggable(optionLiteral: string, optionName: string): any;
    // droppable
    droppable(options: Droppable): JQuery;
    droppable(optionLiteral: string, options: Draggable): JQuery;
    droppable(optionLiteral: string, optionName: string, optionValue: any): JQuery;
    droppable(optionLiteral: string, optionName: string): any;
    droppable(methodName: string): any;
    // resizable
    resizable(options: Resizable): JQuery;
    resizable(optionLiteral: string, options: Resizable): JQuery;
    resizable(optionLiteral: string, optionName: string, optionValue: any): JQuery;
    resizable(optionLiteral: string, optionName: string): any;
    // resizable
    sortable(options: Sortable): JQuery;
    sortable(optionLiteral: string, options: Sortable): JQuery;
    sortable(optionLiteral: string, optionName: string, optionValue: any): JQuery;
    sortable(optionLiteral: string, optionName: string): any;
    // accordion
    accordion(options: Accordion): JQuery;
    accordion(optionLiteral: string, options: Accordion): JQuery;
    soraccordiontable(optionLiteral: string, optionName: string, optionValue: any): JQuery;
    accordion(optionLiteral: string, optionName: string): any;
}