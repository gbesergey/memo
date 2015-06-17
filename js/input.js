function Input(graph) {
    var input = this;
    this.graph = graph;
    // MouseEvent, [WheelEvent], KeyboardEvent, TouchEvent
    this.eventBuffer = [];
    this.currentPatterns = [];

    this.STARTING_STATES = {
        NOT_SELECTED: function NOT_SELECTED() {
            return memo.selection.length == 0;
        },
        ONLY_NODES_SELECTED: function ONLY_NODES_SELECTED() {
            return memo.selectedNodes.length != 0 && memo.selectedRelationships.length == 0;
        }
    };

    this.InputPattern = new function () {
        this.position = 0;
    };

    this.INPUT_PATTERNS = {
        CLICK: Object.create(this.InputPattern, {
            next : function (inputEvent) {

            }
        }),
        MOUSE_MOVE: Object.create(this.InputPattern, {
            next : function (inputEvent) {

            }
        })
    };

    this.MANIPULATIONS = {
        SELECT_NODE: function (eventBuffer) {

        }
    };

    Input.prototype.consume = function (inputEvent) {
        this.eventBuffer.push(inputEvent);
    };

    Input.prototype.next = function () {
        for (var event in this.eventBuffer) {
            for (var inputPattern in this.INPUT_PATTERNS) {
                jQuery.extend({}, );
            }
        }
    };
}
