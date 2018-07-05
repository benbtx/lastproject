# Core

此为框架中核心代码存放处。

现在共有以下文件：

1. [Base.class.ts](#Base.class.ts)
2. [BaseWidget.class.ts](#BaseWidget.class.ts)
3. [Functions.module.ts](#Functions.module.ts)
4. [LoadManager.class.ts](#LoadManager.class.ts)

*注：*点击即可跳转到对应文件的说明

# Base.class.ts

定义框架内所有类的基类，包含最基础的变量以及方法。

# BaseWidget.class.ts

定义框架内所有 Widget 类的基类，其继承自 `Base.class` 并增加了相对应的大量属性和**生命周期**。

# Functions.module.ts

此模块中存放了一些公共的通用的函数，其作为一个狂降价私有公共函数库来使用（类似`Lodash`和`Underscore`但是只提供他们没有的一些方法）。
此模块大家可自行增加公共方法，并一起重构和维护。

# LoadManager.class.ts

此文件为模块加载管理器，它通过 `main.ts` 中传入的配置信息，来构建所有模块的依赖树，然后按层次加载这些模块。