import BaseWidget = require('core/BaseWidget.class');
import Functions = require('core/Functions.module');



export = Logo;

class Logo extends BaseWidget {
    baseClass = "widget-logo";

    startup() {
        var data = {
            imgSrc: Functions.concatUrl(this.widgetPath, this.config.logoPath),
            href:this.config.link
        }
        var htmlString = _.template(this.template)(data);
        this.setHtml(htmlString);
        this.ready();
    }
}