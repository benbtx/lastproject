import BaseWidget = require('core/BaseWidget.class');
import Map = require("esri/map");

export = Hantuzhan;
/**
* Description:旱土站三维展示模块
* @class 
*/
class Hantuzhan extends BaseWidget {
    baseClass = "widget-hantuzhan";
    startup() {
        var html = _.template(this.template)({
            modelurl:this.config.modelurl
        })
        this.setHtml(html);
        this.ready();
        this.init();
    }
    destroy() {
        this.afterDestroy();
    }
    /**
    * (方法说明)初始化
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    init() {
        //this.domObj.find('.version-num').text("V"+this.AppX.appConfig.version);
        
    }
}