import BaseWidget = require('core/BaseWidget.class');
import Map = require("esri/map");

export = Version;

class Version extends BaseWidget {
    baseClass = "widget-version";
    startup() {
        this.setHtml(this.template);
        this.ready();
        this.init();
    }
    /**
    * (方法说明)初始化
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    init() {
        this.domObj.find('.version-num').text("V"+this.AppX.appConfig.version);
    }
}