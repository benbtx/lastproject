import BaseWidget = require('core/BaseWidget.class');

export = Loading;

class Loading extends BaseWidget {
    baseClass = "widget-loading";

    startup() {
        (function (that) {
            var obj = $('.widget-loading');
            obj.find('.progress-bar-striped').data('count','100');
            setTimeout(function () {
                obj.hide(100, function () {
                    obj.remove();
                    that.ready();
                });
            },1000);
        })(this);
    }
}