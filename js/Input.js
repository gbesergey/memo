"use strict";
class Input {
    /** @typedef {(MouseEvent|KeyboardEvent|TouchEvent)} MemoInputEvent*/

    /**
     * @param {Graph} graph
     */
    constructor(graph) {
        /** @type {Graph} */
        this._graph = graph;
        /** @type {Array.<MemoInputEvent>} */
        this._eventBuffer = [];
        /** @type {Array.<InputProcessor>} */
        this._runningInputProcessors = [];
    }

    /**
     * @param {MemoInputEvent} inputEvent
     * @return {undefined}
     */
    feed(inputEvent) {
        this._eventBuffer.push(inputEvent);
    }

    /**
     * @return {undefined}
     */
    next() {
        for (var eventIndex in this._eventBuffer) {
            for (var inputProcessorEntryName in InputProcessor.STARTING_STATE_CHECKER_TO_INPUT_PROCESSOR_MAP) {
                var inputProcessorEntry = InputProcessor.STARTING_STATE_CHECKER_TO_INPUT_PROCESSOR_MAP[inputProcessorEntryName];
                if (inputProcessorEntry.startingStateChecker.check(this._graph)) {
                    this._runningInputProcessors.push(inputProcessorEntry.getInputProcessor());
                }
            }
            // "reverse for" for splice to work correctly
            for (var i = this._runningInputProcessors.length - 1; i >= 0; i--) {
                var runningInputProcessor = this._runningInputProcessors[i];
                var eventProcessingResult = runningInputProcessor.next(this._eventBuffer[eventIndex]);
                if (eventProcessingResult != null && typeof eventProcessingResult == "object") {
                    runningInputProcessor.action(this._graph, eventProcessingResult);
                    this._runningInputProcessors.splice(i, 1);
                } else if (eventProcessingResult === false) {
                    this._runningInputProcessors.splice(i, 1);
                }
            }
        }
        this._eventBuffer = [];
    }
}

class StartingStateChecker {
    /**
     * @return {Object<string, StartingStateChecker>}
     */
    static get STARTING_STATE_CHECKERS() {
        return {
            ANY: new StartingStateChecker((graph) => true),
            NOT_SELECTED: new StartingStateChecker((graph) => graph.selection.length == 0),
            ONLY_NODES_SELECTED: new StartingStateChecker((graph) => graph.selectedNodes.length != 0 && graph.selectedRelationships.length == 0)
        }
    }

    /**
     * @param {function(Graph): boolean} checkerFunction
     */
    constructor(checkerFunction) {
        this._checkerFunction = checkerFunction;
    }


    /**
     * @param {Graph} graph
     * @return {boolean}
     */
    check(graph) {
        return this._checkerFunction(graph);
    }
}

class InputPatternMatcher {

    /**
     * @return {number}
     */
    static get DEFAULT_TIMEOUT() {
        return 50000;
    }
    
    /**
     * @return {Object.<string, InputPatternMatcher>}
     */
    static get INPUT_PATTERN_MATCHERS() {
        return {
            LEFT_CLICK: () => (new InputPatternMatcher(
                    [
                        {
                            match: (inputEvent) => inputEvent instanceof MouseEvent && inputEvent.type == "mousedown" && inputEvent.button == 0, 
                            readParams: (inputEvent) => ({x: inputEvent.screenX, y: inputEvent.screenY})
                        }
                    ],
                    null, InputPatternMatcher.DEFAULT_TIMEOUT)
            ),
            MIDDLE_CLICK: () => (new InputPatternMatcher(
                    [
                        {
                            match: (inputEvent) => inputEvent instanceof MouseEvent && inputEvent.type == "mousedown" && inputEvent.button == 1,
                            readParams: (inputEvent) => ({x: inputEvent.clientX, y: inputEvent.clientY})
                        }
                    ], null, InputPatternMatcher.DEFAULT_TIMEOUT)
            ),
            MOUSE_MOVE: () => (new InputPatternMatcher(
                    [
                        {
                            match: (inputEvent) => inputEvent instanceof MouseEvent && inputEvent.type == "mousemove" &&
        (inputEvent.movementX != 0 || inputEvent.movementY != 0),
                            readParams: (inputEvent) => ({})
                        }
                    ], null, InputPatternMatcher.DEFAULT_TIMEOUT)
            ),
            EDGE: () => (new InputPatternMatcher(
                    [
                        {
                            match: (inputEvent) => {debug("1"); return inputEvent instanceof MouseEvent && inputEvent.type == "mousedown" &&
                            inputEvent.button == 1},
                            readParams: (inputEvent) => ({startX: inputEvent.clientX, startY: inputEvent.clientY})
                        },
                        {
                            match: (inputEvent) => {debug("2"); return inputEvent instanceof MouseEvent && inputEvent.type == "mouseup" && inputEvent.button == 1},
                            readParams: (inputEvent) => ({endX: inputEvent.clientX, endY: inputEvent.clientY})
                        }
                    ], null, InputPatternMatcher.DEFAULT_TIMEOUT)
            ),
        }
    }

    /** @typedef {{}} InputData */
    
    /**
     * @param {Array.<{match: function(MemoInputEvent):boolean, readParams: function(MemoInputEvent):InputData}>} patternMatchingFunctions
     * @param {function(MemoInputEvent): boolean} cancelFunction
     * @param {number} timeout
     */
    constructor (patternMatchingFunctions, cancelFunction, timeout) {
        this._patternMatchingFunctions = patternMatchingFunctions;
        this._cancelFunction = cancelFunction;
        this._timeout = timeout;
        this._currentMatchingFunction = 0;
        this._inputData = {};
    }
    
    /**
     * @param {MemoInputEvent} inputEvent
     * @return {undefined|boolean|InputData}
     */
    next(inputEvent) {
        this._startTime = this._startTime == undefined ? Date.now() : this._startTime;
        var result = null;
        if (Date.now() - this._startTime > this._timeout) {
            result = false;
        } else if (this._cancelFunction && this._cancelFunction(inputEvent)) {
            result = false;
        } else {
            if (this._patternMatchingFunctions[this._currentMatchingFunction].match(inputEvent)) {
                var inputData = this._patternMatchingFunctions[this._currentMatchingFunction].readParams(inputEvent);
                for (var propName in inputData) {
                    this._inputData[propName] = inputData[propName]; 
                }
                this._currentMatchingFunction++;
                if (this._currentMatchingFunction == this._patternMatchingFunctions.length) {
                    result = this._inputData;
                }
            }
        }
        return result;
    }
}

class InputProcessor {
    /**
     * @return {Object.<string, {startingStateChecker: StartingStateChecker, getInputProcessor: function():InputProcessor}>}
     * @constructor
     */
    static get STARTING_STATE_CHECKER_TO_INPUT_PROCESSOR_MAP() {
        return {
            SELECT_NODE: {
                startingStateChecker : StartingStateChecker.STARTING_STATE_CHECKERS.NOT_SELECTED,
                getInputProcessor : () => new InputProcessor(
                    InputPatternMatcher.INPUT_PATTERN_MATCHERS.LEFT_CLICK(),
                    function (graph, inputData) {
                        graph.selectNode(inputData.x, inputData.y);
                    }
                )
            },
            CREATE_NODE: {
                startingStateChecker : StartingStateChecker.STARTING_STATE_CHECKERS.ANY,
                getInputProcessor : () => new InputProcessor(
                    InputPatternMatcher.INPUT_PATTERN_MATCHERS.MIDDLE_CLICK(),
                    function (graph, inputData) {
                        graph.addNode(graph.xScreenToGlobal(inputData.x), graph.yScreenToGlobal(inputData.y));
                    }
                )
            },
            CREATE_EDGE: {
                startingStateChecker : StartingStateChecker.STARTING_STATE_CHECKERS.ANY,
                getInputProcessor : () => new InputProcessor(
                    InputPatternMatcher.INPUT_PATTERN_MATCHERS.EDGE(),
                    function (graph, inputData) {
                        
                        graph.createEdge(graph.xScreenToGlobal(inputData.startX), graph.yScreenToGlobal(inputData.startY), graph.xScreenToGlobal(inputData.endX), graph.yScreenToGlobal(inputData.endY));
                    }
                )
            },
        }
    }

    /**
     * @param {InputPatternMatcher} inputPatternMatcher
     * @param {function(Graph, InputData): undefined} action
     */
    constructor(inputPatternMatcher, action) {
        this._inputPatternMatcher = inputPatternMatcher;
        this._action = action;
    }

    /**
     * @param {MemoInputEvent} inputEvent
     * @return {undefined|boolean}
     */
    next(inputEvent) {
        return this._inputPatternMatcher.next(inputEvent);
    }

    /**
     * @param {Graph} graph
     * @param {InputData} inputData
     * @return undefined
     */
    action(graph, inputData) {
        this._action(graph, inputData);
    }
}

function debug(param) {
    var a = param;
}