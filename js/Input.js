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
     */
    feed(inputEvent) {
        this.eventBuffer.push(inputEvent);
    }

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

    static get STARTING_STATE_FUNCTIONS() {
        return {
            NOT_SELECTED: function NOT_SELECTED() {
                return this.graph.selection.length == 0;
            },
            ONLY_NODES_SELECTED: function ONLY_NODES_SELECTED() {
                return this.graph.selectedNodes.length != 0 &&
                    this.graph.selectedRelationships.length == 0;
            }
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
                Input.STARTING_STATE_FUNCTIONS.NOT_SELECTED,
                new InputProcessor(
                    Input.INPUT_PATTERN_MATCHERS.LEFT_CLICK,
                    function (position, inputEvent) {
                        if (position == 0) {
                            this.x = inputEvent.screenX;
                            this.y = inputEvent.screenY;
                        }
                    }, function (inputEvent) {
                        var result = this.inputMatcher.next(this.position,
                            inputEvent);
                        if (result !== false) {
                            this.parametersCollector(this.position, inputEvent);
                        }
                        return result;
                    }, function () {
                        this.graph.selectNode(this.x, this.y);
                    }
                )
            )
        }
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
     * @return {boolean}
     */
    next() {
        return this._next();
    }
}

class InputProcessor {

    /**
     * @param {InputPatternMatcher} inputPatternMatcher
     * @param {function(number, InputEvent)} parametersCollector
     * @param {function(InputEvent): number} next
     * @param {function(): undefined} action
     */
    constructor(inputPatternMatcher, parametersCollector, next, action) {
        this._position = 0;
        this._inputPatternMatcher = inputPatternMatcher;
        this._parametersCollector = parametersCollector;
        this._next = next;
        this._action = action;
    }

    /**
     * @return {undefined}
     */
    next() {
        this._next();
    }
}


class Manipulation {

    /**
     * @param {function} startingStateFunction
     * @param {InputProcessor} inputProcessor
     */
    constructor(startingStateFunction, inputProcessor) {
        this._startingStateFunction = startingStateFunction;
        this._inputProcessor = inputProcessor;
    }

    get inputProcessor() {
        return this._inputProcessor
    }
}