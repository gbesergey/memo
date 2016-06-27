class Input {
    /** @typedef {(MouseEvent|KeyboardEvent|TouchEvent)} */
    InputEvent;
    
    constructor(graph) {
        this.graph = graph;
        /** @type {Array.<InputEvent>} */
        this.eventBuffer = [];
        this.runningInputProcessors = [];
    }

    /**
     * @param {InputEvent} inputEvent
     * @return {undefined}
     */
    feed(inputEvent) {
        this.eventBuffer.push(inputEvent);
    }

    /**
     * @return {undefined}
     */
    next() {
        for (var eventIndex in this.eventBuffer) {
            for (var manipulationIndex in Input.MANIPULATIONS) {
                var manipulation = Input.MANIPULATIONS[manipulationIndex];
                if (manipulation.isStartingState()) {
                    this.runningInputProcessors.push(manipulation.getInputProcessor());
                }
            }
            for (var inputProcessorIndex in this.runningInputProcessors) {
                var inputProcessor = this.runningInputProcessors[inputProcessorIndex];
                var eventProcessingResult = inputProcessor.next(this.eventBuffer[eventIndex]);
                if (eventProcessingResult == true) {
                    inputProcessor.manipulation();
                    this.runningInputProcessors.splice(inputProcessorIndex, 1);
                } else if (eventProcessingResult === false) {
                    this.runningInputProcessors.splice(inputProcessorIndex, 1);
                }
            }
        }
    }

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
     * @return {Object.<string, Manipulation>}
     * @constructor
     */
    static get MANIPULATIONS() {
        // var input = this;
        return {
            SELECT_NODE: new Manipulation(
                Input.STARTING_STATE_CHECKERS.NOT_SELECTED,
                new InputProcessor(
                    Input.INPUT_PATTERN_MATCHERS.LEFT_CLICK,
                    function (position, inputEvent) {
                        if (position == 0) {
                            this.x = inputEvent.screenX;
                            this.y = inputEvent.screenY;
                        }
                    }, function () {
                        this.graph.selectNode(this.x, this.y);
                    }
                )
            )
        }
    }
}

class StartingStateChecker {
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
     * @param {function(number, InputEvent): boolean} patternMatchingFunction
     */
    constructor (patternMatchingFunction) {
        this._next = patternMatchingFunction;
    }

    /**
     * @param {number} position
     * @param {InputEvent} inputEvent
     * @return {boolean}
     */
    next(position, inputEvent) {
        return this._next();
    }
}

class InputProcessor {

    /**
     * @param {InputPatternMatcher} inputPatternMatcher
     * @param {function(number, InputEvent)} parametersCollector
     * @param {function(): undefined} action
     */
    constructor(inputPatternMatcher, parametersCollector, action) {
        this._position = 0;
        this._inputPatternMatcher = inputPatternMatcher;
        this._parametersCollector = parametersCollector;
        this._action = action;
    }

    /**
     * @param {InputEvent} inputEvent
     * @return {boolean}
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
}


class Manipulation {

    /**
     * @param {StartingStateChecker} startingStateChecker
     * @param {InputProcessor} inputProcessor
     */
    constructor(startingStateChecker, inputProcessor) {
        this._startingStateChecker = startingStateChecker;
        this._inputProcessor = inputProcessor;
    }
}