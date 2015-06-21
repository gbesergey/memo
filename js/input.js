function Input(graph) {
    var input = this;

    input.graph = graph;
    // MouseEvent, [WheelEvent], KeyboardEvent, TouchEvent
    input.eventBuffer = [];
    input.currentInputProcessors = [];

    input.STARTING_STATE_FUNCTIONS = {
        NOT_SELECTED: function NOT_SELECTED() {
            return input.graph.selection.length == 0;
        },
        ONLY_NODES_SELECTED: function ONLY_NODES_SELECTED() {
            return input.graph.selectedNodes.length != 0 && input.graph.selectedRelationships.length == 0;
        }
    };

    input.INPUT_PATTERN_MATCHERS = {
        LEFT_CLICK: {
            next: function (position, inputEvent) {
                if (inputEvent instanceof MouseEvent && inputEvent.button == 0) {
                    return true;
                } else {
                    return false;
                }
            }
        },
        MOUSE_MOVE: {
            next: function (position, inputEvent) {
                if (inputEvent instanceof MouseEvent && (inputEvent.movementX != 0 || inputEvent.movementY != 0)) {
                    return true;
                } else {
                    return false;
                }
            }
        }
    };

    input.MANIPULATIONS = {
        SELECT_NODE: {
            isStartingState: input.STARTING_STATE_FUNCTIONS.NOT_SELECTED,
            getInputProcessor: function () {
                return {
                    position: 0,
                    inputMatcher: input.INPUT_PATTERN_MATCHERS.LEFT_CLICK,
                    parametersCollector: {
                        next: function(position, inputEvent) {
                            if (position == 0) {
                                this.x = inputEvent.screenX;
                                this.y = inputEvent.screenY;
                            }
                        }
                    },
                    manipulation: function () {
                        input.graph.selectNode(this.x, this.y);
                    },
                    next: function(inputEvent) {
                        var result = this.inputMatcher.next(this.position, inputEvent);
                        if (result !== false ) {
                            this.parametersCollector(this.position, inputEvent);
                        }
                        return result;
                    }
                };
            }
        }
    }
}

Input.prototype.consume = function (inputEvent) {
    input.eventBuffer.push(inputEvent);
};

Input.prototype.next = function () {
    for (var eventIndex in input.eventBuffer) {
        for (var manipulationIndex in input.MANIPULATIONS) {
            var manipulation = input.MANIPULATIONS[manipulationIndex];
            if (manipulation.isStartingState()) {
                input.currentInputProcessors.push(manipulation.getInputProcessor());
            }
        }
        for (var inputProcessorIndex in input.currentInputProcessors) {
            var inputProcessor = input.currentInputProcessors[inputProcessorIndex];
            var eventProcessingResult = inputProcessor.next(input.eventBuffer[eventIndex]);
            if (eventProcessingResult == true) {
                inputProcessor.manipulation();
                input.currentInputProcessors.splice(inputProcessorIndex ,1);
            } else if (eventProcessingResult === false) {
                input.currentInputProcessors.splice(inputProcessorIndex ,1);
            }
        }
    }
};
