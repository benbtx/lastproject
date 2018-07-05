import BaseWidget = require('core/BaseWidget.class');
export = TerminalStateMonitoring;

class TerminalStateMonitoring extends BaseWidget {
    baseClass = "widget-terminalstatemonitoring";

    startup() {       
        this.setHtml(this.template);
        this.ready();
    }
}