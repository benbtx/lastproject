import Base = require("core/Base.class");
import Functions = require('core/Functions.module');

export = LoadManager;

/**
 * 模块加载管理器
 * 根据配置文件来分析构建依赖树
 * 然后将所有依赖树分层，逐个加载每层中的元素
 */
class LoadManager extends Base {
    // CountToRun 的一个实例
    // 用于保证每一层所有模块加载完成后，执行一个特定的函数（继续加载下一层）
    taskManager: Functions.CountToRun;
    countForDependTree: number = 0;
    dependTree: Array<any>;

    startup() {

    }

    /* 加载模块
    // 将传入如下格式config
    // [
    //     {
    //         "name": "Loading",
    //         "discription": "加载动画",
    //         "url": "widgets/Loading",
    //         "main": "Widget",
    //         "configPath": "",
    //         "templatePath": "",
    //         "optional": false
    //     },
    //     {
    //         "name": "EndLoading",
    //         "discription": "结束加载动画",
    //         "url": "widgets/EndLoading",
    //         "main": "Widget",
    //         "configPath": "",
    //         "templatePath": "",
    //         "depend": "MenuBar",
    //         "optional": false
    //     },
    //     {
    //         "name": "Header",
    //         "discription": "系统头部",
    //         "url": "widgets/Header",
    //         "main": "Widget",
    //         "configPath": "",
    //         "templatePath": "",
    //         "depend": "Loading",
    //         "optional": false
    //     }
    // ]
    */
    load(config) {
        if (!config) {
            this.bug("未传入Config!");
        }
        // 根据配置来构建依赖树
        this.dependTree = this.analysisDependTree(config);
        // 加载这些模块，传入参数可以设置
        this.loadModules(this.dependTree[this.countForDependTree]);
    }

    /* 分析并构建依赖树
        其作用为分析模块间的依赖关系并构建一个依赖树，示例如下
        例如，模块配置如下：
        [
            {
                name: "A",
                depend: "C"
            },
            {
                name: "B"
            },
            {
                name: "C",
                depend: "B"
            },
            {
                name: "D",
                depend: "B"
            },
        ]
        
        进行分析后，将会函数返回以下结果
        [
            [
                {
                    name: "B"
                }
            ],
            [
                {
                    name: "C",
                    depend: "B"
                }, {
                    name: "D",
                    depend: "B"
                }
            ],
            [
                {
                    name: "A",
                    depend: "C"
                }
            ]
        ]
    */
    // 注：此函数如需维护，直接重写。
    analysisDependTree(config) {
        if (!config) {
            return;
        }
        var result = new Array();
        var rest = config;
        result.push([{ name: undefined }, { name: "" }]);
        for (var level = 1; ; level++) {
            var a = new Array();
            var b = new Array();
            var founded = false;
            for (var i = 0, j = rest.length; i < j; i++) {
                founded = false;
                for (var n = 0, m = result[level - 1].length; n < m; n++) {
                    if (result[level - 1][n].name === rest[i].depend) {
                        a.push(rest[i]);
                        founded = true;
                        break;
                    }
                }
                if (founded === false) {
                    b.push(rest[i]);
                }
            }
            if (a.length === 0) {
                result.push(b);
                return result.slice(1);
            }
            if (a.length === rest.length) {
                result.push(a);
                return result.slice(1);
            }
            result.push(a);
            rest = b;
        }
    }

    // 根据传入的包含模块地址的数组,进行调用
    // 只管require以及安排计数
    loadModules(currentWidgetsConfig: Array<any>) {
        if (!currentWidgetsConfig) {
            return;
        }
        var that = this;

        /* 依次加载每层模块 */
        // 初始化 CountToRun 实例
        that.taskManager = new Functions.CountToRun(function () {
            /* 当计数器为 0 时，需要执行的回调函数 */
            // 设置层数+1
            that.countForDependTree++;
            // 根据层数来加载对应层的所有模块
            that.loadModules(that.dependTree[that.countForDependTree]);
        }, that);
        that.taskManager.setCount(currentWidgetsConfig.length);

        // 获取当前层需要加载的所有模块的地址
        var widgetUrls = that.getWidgetsUrl(currentWidgetsConfig);

        // 根据地址加载这些模块
        require({}, widgetUrls, function () {
            /* 初始化每个模块 */
            for (var i = 0, j = arguments.length; i < j; i++) {
                // 当前模块的配置文件地址
                var currentWidgetCongfigPath = Functions.concatUrl(
                    currentWidgetsConfig[i].url,
                    currentWidgetsConfig[i].configPath
                );
                // 当前文件的模板文件地址
                var currentWidgetTemplatePath = Functions.concatUrl(
                    currentWidgetsConfig[i].url,
                    currentWidgetsConfig[i].templatePath
                )
                // 初始化当前模块
                new (arguments[i])({
                    // 传入模块的地址
                    widgetPath: currentWidgetsConfig[i].url,
                    // 传入模块的配置文件地址
                    configPath: currentWidgetsConfig[i].configPath ?
                        currentWidgetCongfigPath : undefined,
                    // 传入模块的模板文件地址
                    templatePath: currentWidgetsConfig[i].templatePath ?
                        currentWidgetTemplatePath : undefined,
                    // 模块加载完成后的回调函数
                    // 此处绑定的函数为：
                    //      让CountToRun的计数器减一
                    readyCallback: that.taskManager.minus.bind(that.taskManager)
                });
            }
        });
    }


    // config 中为当前层的所有模块
    // 函数将所有的模块做解析并返回由所有模块地址组成的一个数组
    // 每个数组元素为一个完整的模块地址如["widgets/BaseMap/Widget"]
    getWidgetsUrl(config: Array<{}>) {
        var widgetsUrl: Array<string>;

        if (_.isArray(config) === true) {
            widgetsUrl = _.map(config, (widget: any) => {
                return Functions.concatUrl(widget.url, widget.main);
            })
        }
        return widgetsUrl;
    }
}