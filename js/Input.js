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
            for (var runningInputProcessorIndex in this._runningInputProcessors) {
                var runningInputProcessor = this._runningInputProcessors[runningInputProcessorIndex];
                var eventProcessingResult = runningInputProcessor.next(this._eventBuffer[eventIndex]);
                if (eventProcessingResult == true) {
                    runningInputProcessor.action(this._graph);
                    this._runningInputProcessors.splice(runningInputProcessorIndex, 1);
                } else if (eventProcessingResult === false) {
                    this._runningInputProcessors.splice(runningInputProcessorIndex, 1);
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
     * @return {Object.<string, InputPatternMatcher>}
     */
    static get INPUT_PATTERN_MATCHERS() {
        return {
            LEFT_CLICK: new InputPatternMatcher(
                (position, inputEvent) => inputEvent instanceof MouseEvent && inputEvent.button == 0
            ),
            MOUSE_MOVE: new InputPatternMatcher(
                (position, inputEvent) => inputEvent instanceof MouseEvent &&
                (inputEvent.movementX != 0 || inputEvent.movementY != 0)
            )
        }
    }
    
    /**
     * @param {function(number, MemoInputEvent): boolean} patternMatchingFunction
     */
    constructor (patternMatchingFunction) {
        this._next = patternMatchingFunction;
    }

    /**
     * @param {number} position
     * @param {MemoInputEvent} inputEvent
     * @return {undefined|boolean}
     */
    next(position, inputEvent) {
        return this._next(position, inputEvent);
    }
}

class InputProcessor {
    /**
     * @return {Object.<string, Object<string, StartingStateChecker|function():InputProcessor>>}
     * @constructor
     */
    static get STARTING_STATE_CHECKER_TO_INPUT_PROCESSOR_MAP() {
        return {
            SELECT_NODE: {
                startingStateChecker : StartingStateChecker.STARTING_STATE_CHECKERS.NOT_SELECTED,
                getInputProcessor : () => new InputProcessor(
                    InputPatternMatcher.INPUT_PATTERN_MATCHERS.LEFT_CLICK,
                    function (position, inputEvent) {
                        if (position == 0) {
                            this.x = inputEvent.screenX;
                            this.y = inputEvent.screenY;
                        }
                    }, function (graph) {
                        graph.selectNode(this.x, this.y);
                    }
                )
            }
        }
    }

    /**
     * @param {InputPatternMatcher} inputPatternMatcher
     * @param {function(number, MemoInputEvent)} parametersCollector
     * @param {function(Graph): undefined} action
     */
    constructor(inputPatternMatcher, parametersCollector, action) {
        this._position = 0;
        this._inputPatternMatcher = inputPatternMatcher;
        this._parametersCollector = parametersCollector;
        this._action = action;
    }

    /**
     * @param {MemoInputEvent} inputEvent
     * @return {undefined|boolean}
     */
    next(inputEvent) {
        var result = this._inputPatternMatcher.next(this._position,
            inputEvent);
        if (result !== false) {
            this._parametersCollector(this.position, inputEvent);
        }
        this._position++;
        return result;
    }

    /**
     * @param {Graph} graph
     * @return undefined
     */
    action(graph) {
        this._action(graph);
    }
}