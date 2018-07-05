import BaseWidget = require('core/BaseWidget.class');

export = LoadMask;

class LoadMask extends BaseWidget {
    baseClass = "widget-loadmask";

    startup() {
        this.setHtml(this.template);
        this.AppX.runtimeConfig.loadMask = new loadMask(this.domObj);
        this.ready();
    }
}

class loadMask {
    domObj: JQuery;
    animationTime: number = 0;

    constructor(domObj: JQuery) {
        this.domObj = domObj;
        this.domObj.find('.close').on('click', function () {
            this.Hide();
        }.bind(this));
    }

    Show(message?: string) {
        if (message !== undefined)
            this.domObj.find('.message').text(message);
        else {
            this.domObj.find('.message').text("正在分析中，请耐心等待...");
        }
        this.domObj.show(this.animationTime);
    }

    Hide() {
        this.domObj.hide(this.animationTime);
    }
}