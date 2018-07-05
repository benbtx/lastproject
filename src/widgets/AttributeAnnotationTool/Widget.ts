import BaseWidget = require('core/BaseWidget.class');
import Functions = require('core/Functions.module');

/*** 暴露类 ***/
export = AttributeAnnotationTool;

class AttributeAnnotationTool extends BaseWidget {
    baseClass = "widget-AttributeAnnotationTool";

    startup() {

        this.setHtml(this.template);
        this.ready();
        this.initEvent();

    }

    initEvent() {
        //click，点击生成
        this.domObj.on("click", () => {
            //生产属性标注
            $(".fire-on[data-id=" + this.config.widgetname + "]").first().trigger("click");
        });
    }
}