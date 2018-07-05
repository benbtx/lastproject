import BaseWidget = require('core/BaseWidget.class');
import Functions = require('core/Functions.module');



export = Loading;

class Loading extends BaseWidget {
    baseClass = "widget-loading";
    debug = false;

    startup() {

        this.setHtml(_.template(this.template)(this.config), '.body');
        this.ready();
        var obj = this.domObj;
        var progressObj = obj.find('.progress-bar-striped');
        var promptObj = obj.find('.prompt span');
        var count, rest;
        var promptLength = this.config.prompt.length;
        var that = this;
        var loop = setInterval(function () {
            count = progressObj.data('count');
            that.log('count:' + count);
            rest = 100 - count;
            if (rest > 10) {
                count += (Math.ceil(Math.random() * 9));
            } else if (rest > 3) {
                count += (Math.ceil(Math.random() * 3));
            } else {
                count = 100;
                clearInterval(loop);
            }
            that.log('count:' + count);
            progressObj.data('count', count);

            progressObj.css('width', count + '%');
            progressObj.text(count + '%');

            promptObj.text(that.config.prompt[(Math.ceil(count / (100 / promptLength))) - 1]);

            if (count > 60) {
                progressObj.removeClass('progress-bar-warning').removeClass('progress-bar-danger').addClass('progress-bar-success');
            } else if (count > 20) {
                progressObj.removeClass('progress-bar-warning').removeClass('progress-bar-danger').addClass('progress-bar-warning');
            }
        }, 200);

    }
}