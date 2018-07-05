import BaseWidget = require('core/BaseWidget.class');
import Map = require("esri/map");

declare var proj4;
export = FieldConfig;


class FieldConfig extends BaseWidget {
    private fieldConfigAll: Array<any> = null;
    constructor(settings) {
        super(settings)
        this.ready();
    }

    startup() {
        this.AppX.runtimeConfig.fieldConfig = this;
        this.init();
    }
    /**
    * (方法说明)初始化
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    private init() {
        $.ajax({
            headers: {
                'Authorization-Token': AppX.appConfig.usertoken
            },
            type: "POST",
            url: AppX.appConfig.apiroot.replace(/\/+$/, "") + "/webapp/fieldconfigall",
            success: this.fieldconfigallCallback.bind(this),
            dataType: "json",
        });
    }
    /**
    * (方法说明)字段配置回调方法
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    private fieldconfigallCallback(data) {
        if (data.code == 10000) {
            this.fieldConfigAll = data.result;
        }
        else
            console.log("获取字段配置信息失败!")
    }
    GetLayerFields(layername): LayerFieldInfo {
        if (this.fieldConfigAll != null) {
            var index = _.findIndex(this.fieldConfigAll, function (layer) { return layer.layername == layername });
            if (index != -1)
                return this.fieldConfigAll[index];
            //var fields:Array<any> = this.fieldConfigAll[index].fields;
            //return fields.map(item=>{return item.name});
        }
        return null;
    }

    Reload() {
        this.init();
    }
}