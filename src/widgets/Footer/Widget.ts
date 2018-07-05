import BaseWidget = require('core/BaseWidget.class');
export = Footer;

class Footer extends BaseWidget {
    baseClass = "widget-footer";

    startup() {       
        this.setHtml(this.template);
        this.ready();
    }
}