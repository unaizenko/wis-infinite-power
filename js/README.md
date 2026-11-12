## 2026-11-12 0.2.2.1 发布

开发 `dev-0.2.2.1-20261112-release-r1`；网页 `release-0.2.2.1-20261112`；APK `release-0.2.2.1-apk-20261112`，versionCode20201。纳入手机成就/统计入口可见性修复：紧凑换行，已解锁入口无需横滑即可看到。成就条件、奖励、存档schema76/model2/rule4/tailPolicy2与APK签名保持。正式网页/APK关闭调试功能。最终验收与发布记录见 `../WIS-项目资源/release-0221-20261112/REPORT.md`；以下未发布说明为历史记录。

## 手机导航可见性

主导航≤900px采用紧凑换行，避免已解锁成就/统计藏在横向滚动区。既有解锁条件不变；测试须检查所有可用入口边界并实际触摸打开成就，不能仅验证横滑可达。以下单行导航描述为历史记录。

## 0.2.2.0 发布构建

开发 build `dev-0.2.2.0-20261112-release-r1`；正式网页与 APK 分别为 `release-0.2.2.0-20261112` / `release-0.2.2.0-apk-20261112`，均独立重建全部 Worker bundle 并关闭开发调试入口。以下各轮 build 为历史记录。

## 手机无限强化详情归属

`UI.Infinity`在≤900px把唯一infinity-details节点插入选中节点所在行后；通过dataset.treeRow保留无详情时行号，大屏移回树后并清除行列定位。过滤/购买仍使用原领域校验与单个购买handler；resize只改DOM不写存档。手机关闭树的浏览器自动滚动锚定，由点击处理补偿详情移动引起的行位置变化。

## 2026-11-11 手机表现层约束

主导航在<=900px为独立横向滚动区；手机竖屏资源为双列且最多40dvh/260px，收起控件在内部滚动保持可见，<=500px短视口资源不吸顶。只改CSS，不触碰Runtime/Evaluation/Save。

CSS缓存随build-config与manifest工具更新。APK/SystemBars原生insets已启用，不重复加CSS系统栏内边距。发布工具必须同时排除原样复制、预置并按offline→online→math顺序重建三类Worker bundle，避免math引用旧offline hash而启动失败。

## 2026-11-11 页面发布边界

`game.js.scheduleRender`拥有最多一个后续host任务，仅保存force/dirty标记，不捕获domain。普通`Loop.flushOnlineRender`和UI异步动作完成使用该入口；`flushRender`显式同步刷新消费已排队请求。首次库存视图仍先绘制；启动完整视图排队，恢复检查点仍同步保存。不得把这个表现队列用于延迟正式状态提交或durable ACK。

`Save.sparseData`仅接收`envelope`复制并校验过的私有域；直接稀疏化以避免再复制一遍。外部live输入仍必须经过envelope边界。数值、schema及保存格式保持。开发build为`dev-0.2.1.4-20261111-publication-r1`；验收见AGENT_CONTEXT/TESTING和E盘main-thread-20261111报告。

## 2026-11-11 锻炼与重型预览Worker（仅开发版）

build `dev-0.2.1.4-20261111-math-worker-r1`，可见0.2.1.4/schema76/model2/rule4/tailPolicy2不变。纯计算迁移：手动锻炼收益、锻炼来源/下一点需求、吐纳预览/下一档需求。其余来源卡片继续本地分片。MathWorker每任务独立、原始精确分量协议、ready唤醒普通调度器，主线程保留原状态身份+输入key+generation验证与原子提交。失败/取消不安装结果，不修改离线时间。未启用1e-9近似。

PureMathWork与Worker共用原规则；普通多来源请求按行保留完成结果，联合假设解锁仍整体求值。经典Blob复用offline引擎，80脚本offline与82脚本math payload；页面101脚本。结构无效回包一次精确本地后备，数学失败显式返回；30秒无进展终止。见tests/math-worker-*和既有调度/导入/支付门禁。

最终核心477/477零skip；完整回归与性能采样见 `../WIS-项目资源/math-worker-20261111/REPORT.md` 和 `acceptance/summary.json`。CDP不支持Worker降速，CPU4仅指主线程；无真机性能保证。剩余主线程长任务已定位为启动重绘/保存聚集和正式提交后重绘/保存，不能继续统一归给数学公式。未修改发布版/APK，未commit/push。

最终完整固定验收21组20通过；唯一失败仍为CPU4主线程100ms长任务门槛。普通CPU预览/锻炼中位2.224/0.656秒，主线程CPU4为4.183/0.967秒；CPU4最慢预览4.684秒、动作1.025秒、反馈72.6ms、长任务179ms。十个冷页面无功能错误。此结果仅代表主线程CDP降速，Worker降速不支持，不是手机保证。

## 2026-11-11 续算阶段与反算搜索优化（仅开发版）

build `dev-0.2.1.4-20261111-stages-r1`；可见0.2.1.4、schema76/model2/rule4/tailPolicy2保持。Scale渐进结算的前置除法/换算、refine中点、反算比较插值保留在原私有任务阶段中；不再随子任务暂停重做已完成准备。小反算区间先用原比较认证两端，失败保留宽区间/完整搜索。无全局跨存档结果缓存，无1e-9近似，无分片最低操作数上调，无新手动Worker。原收益、支付、事件/RNG/clock及离线剩余时间保持。

四份真实档与本轮before完整动作状态/存读一致；准备后取消/换档、完成后输入改变拒绝提交、小分片后备有测试。最终19组18通过，核心465/465无skip；唯一失败是严格性能门禁，十个冷页面无功能错误。普通CPU预览/实际锻炼中位3.241/0.635秒，CPU4为10.948/6.538秒；CPU4动作最慢8.624秒，主线程最长175ms，仍不达5秒/100ms目标。固定原档CPU4旧新新旧隔离纯计算平均5.590→2.547秒，输出哈希相同；不含UI/主循环，不能当手机端到端保证。

独立审查无可行动问题，另15组反算一致。手动/预览Worker已评估但未扩协议；近似未启用，因此低性能仍有等待。历史12失败/8缺档未处理。不宣称整个重构/全仓验收完成。未修改发布版/APK、未commit/push。报告 ../WIS-项目资源/continuation-stages-20261111/REPORT.md。

## 2026-11-11 顶部速率发布修复（开发版，性能仍未验收）

build `dev-0.2.1.4-20261111-rates-r1`；可见0.2.1.4、schema76/model2/rule4/tailPolicy2保持。顶部不再读取会被Effects清零的tmp速率，改为Loop正式提交的resourceGains/processedSeconds非持久快照。同owner普通积压舍弃保留；动作/换档/重置/体系或挑战切换失效。未知、真实0、过期、暂停分别展示，极小正值不显示0，不新增收益公式求值。状态变化只请求顶部重绘；正式动作未提交分片不再反复请求整页重绘，提交及独立输入仍正常刷新。

最终核心460/460、浏览器11组（含3装配）、正常主循环预览3场景通过；原档历史暂停81519.567秒经正式重试完整完成，CPU4/8已提交收益展示与存档往返通过。未改正式数学、RNG、时间账本和离线规则，未新增近似。

性能未通过：初次完整门禁5次CPU4动作均超45秒；修正分片重绘后的单次CPU4动作44.676秒，尚无最终五轮通过证据。旧UI单次23.850秒，但在线输入不相同，不能判定稳定差值或排除回退；下一项须固定动作输入分解公式/渲染成本。本次不能称链路根治、全仓全绿或可发布。历史12失败/8缺档未处理。报告 ../WIS-项目资源/rate-publication-20261111/REPORT.md；未动发布版/APK，未commit/push。

## 2026-11-11 首轮重构边界

`ui/action-view.js` 在app前加载，纯只读状态解释，不求收益、不支付。继续复用createWork/候选/Worker提交边界，未引入第二任务框架。Amount新增稀疏精确比较和可证明分离的分数区间；Scale反算窄区间须原正向公式验证。正式入口、主循环与存档schema不变。武道UI在离线锁定/非武道时不做同步转换预览，恢复后正常计算。开发build refactor-r1；98脚本、80脚本Worker payload。验收与缺口见根目录AGENT_CONTEXT.md及E盘本轮报告。

## 2026-11-11 可选反算范围与自动层数预览边界

AmountFormulas可选comparison候选在dense rational之前检查输入/指数支持范围；越界返回null给原公式，不改变原值或容量。UI将currentQiLayer从硬结构key移到同owner进度标记；进行中快照完成后dirty/at=-Infinity请求更新，导入/挑战/owner变化仍取消。首次来源预览128..256操作+0ms任务等待，普通刷新32..256及16/100ms节流；均是软预算。高值原档CPU4预览60秒失败仍保留，当前不能声明完整门禁通过。

## 2026-11-11 数值复杂度与在线进展边界

- AmountProducts.tailPolicy v2延续原32位系数有向压缩，增加单个分子/分母>512位触发；Amount.compact 只在原有连续owner边界应用。少量复杂尾项单独压缩，主值、paid/count/time精确合同不变；lossUpper为保守误差上界。Save可读policy1/2，写policy2，旧客户端不能降级读新存档。
- CertifiedRankMath.progressVersion仅在私有算术生成器真实推进时递增；Step同步调用前后取差，加已完成阶段计数，Worker只传递递增进度。空轮询不刷新watchdog。
- OnlineCandidateWorker持有30秒静默watchdog；ready/failed/fallback终态先被advance消费，不能让主循环2秒本地watchdog覆盖数值错误。fallback以远端计数+阶段增量接续本地进度。Loop只对timeout退避重试，其他同输入确定性错误保持停止。
- 所有候选仍私有计算/正式提交，导入和输入变更撤销旧任务；离线采用原冻结收益与失败保留债务，不因在线超时丢弃。此机制不提供同步单算子抢占或无限数值容量保证。

## 2026-11-11 审计修复边界

- Save.backup在恢复来源保护或坏主档保护会话中保留已有备份，写入前执行主key冲突检查；正常导入仍备份当前有效进度。恢复成功前不依赖另一笔写入来救回唯一备份。
- UI异步导入持有期间禁止冲突变更；导入回调在异步边界验证事务身份。离线期间允许漂移的偏好仅为现有theme/autoCloseOfflineSummary，由Worker安装与保存文本同步合并；收益域和时间账本仍由候选提交。
- 原生导出显式kind=save/raw，默认save验证有效JSON对象；raw用于原始文本备份，允许损坏或空文本，保留UTF-8与写后读回确认。兼容旧调用默认行为。
- ClosedFormBatch的有限后备搜索保持原费用函数和资金检验；只有普通中点不再前进时使用层级表示坐标中点。局部layer0闭式记录以原binary64序列化，WorkerProtocol仅为明确wis-closed-batch记录恢复该语义，协议版本不变。
- 当前必需测试入口与夹具来源见根目录TESTING.md、tests/current-regression.json、tests/current-fixtures.json。生成物仍由index.html/build-config与既有工具维护。

## 2026-11-11 0.2.1.4 发布版本

开发build dev-0.2.1.4-20261111-release-r1；网页release-0.2.1.4-20261111；APK release-0.2.1.4-apk-20261111，versionCode20104。纳入锻炼反算比较优化、固定准备阶段复用、正常在线预览生命周期与吐纳预览分段续算修复。schema76/model2/rule4、收益规则和原APK签名保持。前轮真实file测试：普通CPU锻炼约5秒/吐纳约1.8秒；4倍降速锻炼仍约23～28秒，非低端数秒保证。发布验收与Git资产记录见 ../WIS-项目资源/release-0214-20261111/REPORT.md；以下未发布说明为历史记录。

## 2026-11-11 0.2.1.3 发布版本

开发build dev-0.2.1.3-20261111-release-r1；网页release-0.2.1.3-20261111；APK release-0.2.1.3-apk-20261111，versionCode20103。纳入无限软上限反算续算修复，保持原收益、schema76/model2/rule4与兼容签名。前轮原档和9项专项验收见下文；本轮发布验证记录位于WIS-项目资源/release-0213-20261111/REPORT.md。下文未发布说明为历史记录。

## 2026-11-10 小比例巨大指数定向强化（仅开发版）

build dev-0.2.1.1-20261110-scaled-increment-r1；可见版本0.2.1.1、schema76/model2/rule4不变。powerIncrement 新增有向缩放后备：先求 |p|r，再约束 |p|ln(1+r)，避免极小比例的固定点误差被巨大指数放大；原线性快路、完整幂差后备与舍入认证保持。

200/200定向回归通过；新增45项含40组独立参考、正负指数/中点两侧、分片/取消、容量失败不重算和离线86400秒债务保存。两个真实档及新建/武道高值模拟共5组离线+10在线步完整domain逐字段对照、宝物/TREE真实增长、RNG/挑战时钟/存档往返一致。扩展40项33通过7失败，已用本轮前基线复跑确认同样7失败，未作全绿承诺。

6次Edge390px触屏视窗Worker/保存刷新通过；正常CPU离线中位205.3ms，主线程4倍降速262.2ms；极端公式单片最长8.5ms。校准确认Worker未同等降速，无连接手机，不能作为低端手机真机成绩。仍有exp参数2048上限和极接近1的起点尾项放大容量边界；不宣称任意数值终止。发布版/APK/commit/push未动。报告：WIS-项目资源/scaled-increment-hardening-20261110/REPORT.md。以下为历史记录。
## 2026-11-10 公式区间收敛专项（仅开发版）

开发build dev-0.2.1.1-20261110-convergence-r1；可见版本/schema76/model2/rule4不变。保留前轮玩家公式修复，新增powerIncrement大差值精确修正和小比例估计无法认证时完整差值后备，均有红绿复现。largeOnePlusLog已有精算后备，两个midpoint侧实际追踪通过；远端尾项、产品、rank-exact与近一对数界均随精度收缩，未发现相同固定宽度平台。

145/145定向回归通过，其中37项专项含31个独立900位参考、单操作续算及原玩家完整81519.567秒离线再在线/严格往返；真实Edge Worker/保存刷新通过。独立数学审查无阻塞。512位容量仍是有限支持边界，例如powerIncrement(1,1e-600,1e600)仍无法认证，不得称所有精度问题已根治。报告WIS-项目资源/formula-convergence-audit-20261110/REPORT.md。发布版/APK/commit/push未动。以下为历史记录。

## 2026-11-10 炼气挑战收益公式舍入边界修复（仅开发版）

开发build dev-0.2.1.1-20261110-qi-formula-r1；可见0.2.1.1、schema76/model2/rule4不变。发布版/APK/Git未更新。

玩家11月10日00:58存档在炼气十万年挑战48207层，离线81519.567秒暂停、在线不增长。共享powerOnePlusMinusOne公式在L≈17.22458采用不随精度收紧的[-2×10^-L,0]界，跨越Decimal舍入边界，512位仍报amount-formula-unresolved。改为可表示时严格求log10(1-10^-L)区间；仅低于当前分辨率时保留原极小项界，不降低精度或改变原档。

最终68/68数值/结算回归通过；180位Python Decimal独立参考和定向红绿通过。原档完整81519.567秒离线收益与10个在线步均可提交，资源增长、存读往返正常；真实Edge390px实际Worker重试/保存/刷新通过，原档SHA未改。报告WIS-项目资源/player-qi-stall-20261110/REPORT.md。以下为历史记录。

## 2026-11-09 发布 0.2.1.1

用户授权同步网页、APK及Git。开发build dev-0.2.1.1-20261109-release-r1；网页release-0.2.1.1-20261109；APK release-0.2.1.1-apk-20261109，versionCode20101。schema76/model2/rule4不变。

本版修复0.2.1.0离线收益误舍弃：截断仅针对在线，混合队列在线前缀/尾段失败不吞掉离线；离线按原冻结算法结算，失败保留时间并暂停/重试，健康分片计算不受2秒/30秒提交期限影响。沿用原APK签名及原生导出修复，不自动补偿历史已丢收益。开发验收45/45，真实存档1小时/12小时资源、宝物、TREE与原冻结算法一致；最终发布验收见WIS-项目资源/release-0211-20261109/REPORT.md。以下为历史记录。

## 2026-11-09 离线收益保留修复（仅开发版）

开发build dev-0.2.1.0-20261109-offline-preserve-r1，可见版本0.2.1.0；schema76/model2/rule4不变，主97/Worker80。发布版、APK、Git发布未更新。

用户明确纠正：截断仅用于在线积压，离线保持原冻结收益。修复pendingDiscard误清空整个恢复队列；在线舍弃负面时钟在在线前缀结束、离线冻结前确认。纯在线限额保留；混合队列在线前缀/尾段超时或数值失败只舍弃对应在线段，后续离线继续；保存失败事务回滚。离线任务不受100ms/2秒截断，失败暂停并保存剩余时间；健康Worker不受30秒未提交期限限制，仍保留心跳故障检测及显式暂停/重试。显式玩家确认放弃入口仍保留，不能用于自动失败回退。

最终定向45/45通过，包含慢结算、35秒健康Worker、混合队列边界、保存回滚、在线限额及旧冻结规则。11月8日20:14真实玩家存档只读，1小时/12小时离线完整资源/宝物/TREE及meta与旧版冻结算法逐字段一致；真实Edge Worker与本地完整状态一致。实际390px页面结算3600秒离线+0.2秒在线、仅确认旧0.048秒在线舍弃、宝物/TREE增长、保存及刷新通过。未补偿历史已丢收益；未做手机真机或APK验收。不声称能识别所有无限循环：同步不响应可由Worker心跳超时暂停；持续让出但永无有效进展需玩家暂停/导出诊断，不能自动吞掉离线时间。

证据与可复跑脚本：WIS-项目资源/offline-loss-diagnosis-20261109/REPORT.md。以下为历史记录。

## 2026-11-08 发布 0.2.1.0

本次用户授权同步网页、APK及Git。开发build dev-0.2.1.0-20261108-release-r1；网页release-0.2.1.0-20261108；APK release-0.2.1.0-apk-20261108，versionName0.2.1.0/versionCode20100。schema76/model2/rule4，主脚本97，两个Worker各80。

纳入有限结算：性能不足时允许舍弃未完成时间及其收益，保留完整已提交事务；100ms是软预算，候选期限2秒，不能中断任意同步JS。负面挑战时钟包含舍弃时间，正向收益不白送。新增Android系统文件保存、读回校验和分享/完整文本回退；Java源归档于native/android-export。旧存档可迁移，新schema76存档不支持退回旧版，请先保留备份。

本次定向Node119项117通过/2外部原件缺失跳过/0失败。前轮7真实档严格往返、两带债档有限结束、原生在线100步全状态对照及e/ee/eee模拟结果见有限结算报告。历史基线失败未当作通过；未完成鸿蒙真机导出、覆盖安装或发热降频验收。最终发布核验记录位于WIS-项目资源/release-0210-20261108/REPORT.md。以下章节为历史记录。

## 2026-11-08 有限结算与APK导出（仅开发版）

开发build dev-0.2.0.4-20261108-bounded-r1；schema76/model2/rule4。用户允许性能不足时丢收益：在线一个候选+0.1现实秒等待，100ms恢复软预算，2秒候选期限，失败同输入抑制；保留完整FIFO事务，超过期限可能零收益。pendingDiscard有序推进负面挑战时钟；快速/寿/E2E3衰减包含舍弃，大罗/正向增长不白送。75/model2/rule3迁移保持债务，新76拒model1及非rule4。旧档原件不覆盖，新档不支持退回旧程序。

APK工程新增独立SAF保存+分享+完整文本；Java编译及mock-native浏览器通过，无鸿蒙真机验收，未打包发布。定向114项113通过/1HEAD同样失败；7真实档严格往返、两原债务超时安全归零；原生在线100步严格一致、e/ee模拟完整提交、eee6公式失败安全回滚；四浏览器脚本通过。详情与失败边界：../WIS-项目资源/bounded-settlement-implementation-20261108/REPORT.md（js目录文档使用../../）。未修改发布版/commit/push。

## 2026-11-08 在线吞吐实施验收：工具落地，两个候选撤回

## 2026-11-08 发布 0.2.0.4

用户本轮授权同步开发、网页发布版及APK并上传Git。当前开发build为dev-0.2.0.4-20261108-release-r1，网页release-0.2.0.4-20261108，APK目标release-0.2.0.4-apk-20261108，Android versionName0.2.0.4/versionCode20008。schema75/model2/rule3不变，正式版本关闭调试。

纳入吐纳/探寻候选一次性提交及在线私有候选Worker；保留原数值、RNG、0.1秒cadence、取消与债务保存，不启用自动丢时间。必要Node回归116项114通过/2外部原件缺失跳过；最终发布资源四尺寸、旧档往返、真实Worker100步全状态、file启动/吐纳/取消/保存重载通过。没有全量、手机性能/发热降频或真机覆盖安装验收，不能宣称积压根治。构建与发布进度见本次报告，旧章节的未发布结论为历史记录。


保留上轮 dev-0.2.0.3-20261108-manual-work-r1；本轮无生产玩法/数值修改，发布版/APK/commit/push未动。吐纳低库存修复仍在；高库存长任务、截图容量报错和手机在线积压不能称已解决。

本轮新增 tests/helpers/online-throughput-metrics.cjs 与 tests/online-throughput-metrics.test.cjs：5/30/60秒实际提交窗口、饱和能力与恢复、顶层host、登记/提交/债务守恒、生命周期与独立容量身份；缺证据只诊断，清债/停钟不得假通过。正常批次采钟通过 registeredThroughAt / clockEvidence 证明，账本容差固定1e-7秒。新26项加既有测量24项共50/50通过。

resourceMagnitudeAt输入保留及Sources.collect分阶段续算均已实现、对照后撤回。后者8步描述符重复读取284→60，但数学工作量未减；40步A/A/B/B/A逐步全状态一致，耗时不稳定。真实Edge390页面CPU1→4→1诊断，CPU4提交µ约0.180→0.193，15秒仍积压约12秒，恢复常速约8.3秒才回到0.1秒cadence内；宿主仍超标。CPU预检均值15.68%、p95 24.45%不合格，不能作为稳定性能通过。所有候选与测试在E盘资源归档，当前生产Sources/Scale/AmountFormulas已恢复本轮前字节。

报告、原始采样摘要、可复跑候选、Worker具体接入评估见 ../../WIS-项目资源/online-throughput-20261108/REPORT.md。Worker未接入，不得描述为吞吐已根治。manifest93与Worker78检查通过，bundle SHA前缀3068acaafcea8968。

以下为历史记录。

## 2026-11-08 手动动作响应性：部分修复，在线积压仍未解决

开发build dev-0.2.0.3-20261108-manual-work-r1；版本0.2.0.3、schema75/model2/rule3，主93/Worker78不变，未发布/更新APK/commit/push。

低于Googol法力库存的吐纳/探寻采用私有分段检查点、完整数学分片、段内冻结Effects以及一次性后处理提交。段入库和探寻付款后失效Effects；每宿主完整逐字段守卫保留原账本/设置排除，陌生形状回退序列化；提交独立COW、失败回滚。高值统一包装曾严重退化，已撤回，保留原积分路径，仍有同步前置长任务；容量报错未复现。

相关53项47通过/6旧失败（5缺原件、1旧错误码断言，原版均复现）；新增15项通过，最新档动作全字段SHA相同。浏览器常速合成吐纳约280–318→140–145ms，宿主最大240→7.7ms；CPU4宿主最大约2.1秒→33ms，但总完成及p99仍有未通过项。均为诊断，未完成干净环境准入或真机验证，不能称积压根治。最终恢复/Worker结果及旧浏览器实时阶段限制见 ../../WIS-项目资源/breathing-backlog-20261108/FINAL-REPORT.md。

以下为历史记录。

## 2026-11-07 发布同步：0.2.0.3

用户授权同步开发、网页发布版和APK并上传Git。开发build dev-0.2.0.3-20261107-release-r1；网页release-0.2.0.3-20261107；APK release-0.2.0.3-apk-20261107，versionName0.2.0.3/versionCode20007，沿用旧证书且Android/WebView/游戏调试关闭。Schema75/model2/rule3不变。

同步此前闭式G极小视图加载、新建状态规范化、探索进度联合类型稀疏保存修复；未另改数值、RNG、clock/debt或旧档弃债规则。必要回归85项83通过/0失败/2缺失原件skip，包含新旧记录矩阵、真实7档与3组Worker、真实浏览器保存导航读回；网页四尺寸/严格往返/file启动通过。未做全量、性能、APK真机覆盖安装；历史未验证项不计通过。完整产物、SHA、Git与在线核验结果见WIS-项目资源/release-0203-20261107/REPORT.md。

以下为历史记录。

## 2026-11-07 当前开发基线：存档表示与真实恢复提交闭环

开发build dev-0.2.0.2-20261107-save-compat-r1；可见0.2.0.2，Save75/model2/rule3不变，主93/Worker78。发布版/APK未同步，未commit/push。保留上一轮闭式G极小视图修复。

State.fresh在当前Amount模型作用域完成正式领域默认/宝物/探寻规范化，避免新游戏首次存读才改变表示；旧schema作用域保持原规则。Save稀疏化保留explorationRewards完整联合类型，避免删掉version后把v2 natural对象误判为旧数组。未改公式、RNG或债务规则。

本轮限定存档专项，最终去重187项183通过/0失败/4缺件跳过；38项新旧记录组合和边界、7份真实存档操作链、3组原生Worker通过。最新档原34.068秒与上一档8.331秒实际恢复，成功Save.write后全字段重读；其余旧档按已授权政策弃债，不计作恢复。只有martial70满足真实购买资格。真实浏览器原生localStorage恢复最新档、导航刷新后字节及全状态一致。

恢复验证必须同时证明实际elapsed与FixedSegment.confirmed增长、pending清空、实际Save.write及读取保存字节全字段一致；禁止仅凭回调次数或retry返回判成功。已实际执行禁用安装与禁用Save.write的反向控制。Worker内存适配器测试不冒充磁盘测试；浏览器导航读回不声称验证断电。

缺件3个外部原件造成4项skip，显式记录；归档72单独命名，不替代原件。历史85项失败未整体清零，旧amount-native-worker P精确断言、缺失原件的amount-recovery-native及未选中内核用例未在本轮改判。未做性能、全量、APK或真机测试。发布版105文件及7份来源SHA不变。详细测试/原断言与新断言/恢复量见WIS-项目资源/save-compatibility-20261107/REPORT.md、FAILURE-LEDGER.md、RESULTS.json。

以下为历史记录。

## 2026-11-07 当前开发基线：闭式G极小进度加载修复

开发build为dev-0.2.0.2-20261107-closed-g-load-fix-r1，可见版本0.2.0.2，Save75/model2/rule3不变，主93/Worker78。发布版/APK仍是此前0.2.0.2，未同步本修复，未commit/push。

BigNumbers.normalize对已读取的gBatch保留序列化superProgress及原有superResidual，沿用gBudget的严格视图校验方式；不再经旧writeGProgress重投影而制造尾项。真正混入尾项、负视图仍拒绝；没有gBatch/gBudget的旧路径仍保留精确尾项。不改结算公式、RNG、时间或存档格式。

新问题档WIS-original-save-1794046107463.json（SHA2767ab96…）原34.068秒债务完整恢复，再在线100步，保存重读及重置后全字段一致。新定向4/4、真实存档操作链7/7、真实Edge Worker3/3、正式App异步导入通过。相关旧测试57项50通过/7失败；修复前源码同样7项失败，未放宽断言，不能算整体全绿。真实档已加入stability-corpus.json；Worker夹具用正式simulateOfflineProgress启动idle待结算队列，不能把retryCatchUp返回当作完成。

证据及限制：WIS-项目资源/save-invalid-20261107/REPORT.md。发布版105个文件和原存档指纹不变；发布版只读复现同一错误。未测真机、APK、全量回归或性能。

以下为历史记录。

## 2026-11-07 发布同步：0.2.0.2

用户授权同步开发、网页发布版与APK并上传Git。开发build dev-0.2.0.2-20261107-release-r1；网页release-0.2.0.2-20261107；APK release-0.2.0.2-apk-20261107，versionCode20006，沿用旧签名，release关闭Android/WebView与游戏调试。Schema75/model2/rule3不变。

同步当前全部正式修复：D12超超分形、圆环累计游玩时间、锻炼首次预览可操作性、一次方中点、统计/重置/候选保存一致性、旧格式加载弃债、超容量公式Decimal处理。详细合同见下节。性能仍待实际设备验证；本轮只做发版必要检查，不宣称全量回归或历史85项失败已解决。验证与产物见WIS-项目资源/release-0202-20261107/REPORT.md。

以下为历史记录。

## 2026-11-07 旧档弃债与超容量公式精度规则（用户授权）

当前开发 build：dev-0.2.0.1-20261107-legacy-capacity-r1；可见版本0.2.0.1，Schema75/model2/rule3，主93/Worker78。发布版/APK未同步，未commit/push。保留此前未提交修复。

旧档定义为schema<75或numericModelVersion=1。完整Save.prepare/prepareWork成功迁移、校验后，丢弃旧offlineRecovery、pendingContinuousTime和onlineCadenceRemaining，清除awaySince，将lastUpdateAt/boundaryAt/registeredUntil设为一次固定的加载时刻；旧债务及导出至加载期间的离线收益不再补算。已结算资源、累计游玩时间、RNG、补偿余额不因弃债而扣减。当前model2/rule3档仍保留并恢复债务；未知模型仍拒绝。低层migrateRecovery继续保护旧规则任务；调用方必须使用prepared.offlineRecovery，不能用原文件队列回填null。

AmountFormulas仅在明确标记的tower logarithm认证坐标容量拒绝时，采用投影后的Decimal精度计算非线性结果，保留原量级，不把ee26022缩为ee2048，不截断持久余额。差分用稳定log1p/expm1；极小输入采用一阶可表示分支，巨大幂增量在log域组合，避免假相消。capacityDiagnostics仅计数，不入档。普通认证未决、除零、非法值仍报错；此分支不再承诺完整尾项认证精度。

库存和付款比较仍走完整账本。AmountProducts增加超大因子的一侧整数界：能够证明与小门槛分离时直接判序；相反无界因子/近边界无法证明时继续拒绝，不投影比较、不扩大2048/8192容量。

必要回归157/157（含真实Edge Worker的最新档恢复、schema61推进），真实档操作链6/6：加载、当前档原债务恢复或旧档弃债、在线100步、具备条件的武道购买、重置、严格全字段保存重读。只有martial70具备该轮购买资格；其他购买阶段N/A。此前三份失败在本轮口径下均通过，但两份旧规则恢复是被授权放弃，并非旧规则求解器已能恢复。

两条“超容量公式必须抛错”的旧断言按本次授权修改，底层证明容量拒绝断言保留。历史宽扫描剩余85项失败未在本轮重跑/闭环，不以本轮定向通过替代。未做页面性能、真机、APK或全量测试；四个历史原件仍缺失。证据：WIS-项目资源/legacy-capacity-policy-20261107/REPORT.md。

以下为历史记录。

## 2026-11-07 稳定性回归与跨模块一致性修复

当前开发 build 为 dev-0.2.0.1-20261107-stability-r1，93主脚本/78 Worker；可见版本0.2.0.1，Save75/model2/rule3不变。保留此前D12、圆环计时、首次锻炼及一次方中点修复；发布版/APK未同步，未commit/push。

本轮修复三项：State运行时累计统计采用与加载相同的lifetime/currentRebirth总量≥峰值规则，空统计尾项删除键；Reset提交前执行现有ExplorationProgress.validate，避免重置后存档重读才升级旧结构；ClosedTreasures.publish复制可变Decimal，避免准备缓存向两个状态发布同一对象。统计修复不把totalPower抬到highestPower，不修改资源余额或RNG；它让统计在运行时就符合原有加载下限，并非补发资源。

定向57/57（含生成Worker真实执行）和迁移专项11/11通过。战神图录/神国的合成真实DOM购买→后处理→实际保存字节→渲染→下一步→重读均通过，内部诊断hook有正对照。它不能替代尚未取得的武道报错原档。

回归集6份：最新实际档恢复原8.331秒+在线100步+严格往返/重置通过；历史Worker派生档通过；仓库schema72玩家夹具恢复原0.105秒后同链通过。旧schema64/70带旧规则pending被CLOSED_RECOVERY_PROTECTED保护；schema61原0.033秒恢复被ee26022输入超出认证坐标2048阻塞，仍未修复。四个历史原件路径缺失，未静默替换。

117文件宽扫描816项725通过/91失败，随后迁移断言专项修复其中6项；余85项尚未闭环。详见stability-regression-20261107/FAILURE-LEDGER.md，不能称整体回归通过，不能把旧失败自动豁免。本轮未做页面性能、真机或全量所有文件测试。

以下为历史记录。

## 2026-11-07 实际存档一次方认证中点修复

开发build dev-0.2.0.1-20261107-power-identity-fix-r1，保留圆环/预览修复和D12。AmountFormulas的power/powerRatio在指数精确为1、除数精确为1时直接投影完整Amount（仍包含尾项），避免恒等运算经ln/exp形成永远跨越浮点中点的区间。除零先检查；其它幂认证不变，无精度门槛放宽。

实际存档WIS-original-save-1794026411791.json（SHA e766f37c…）能加载，但万妖幡倍率1+0.003n=2294898760382616.25的一次方报amount-formula-unresolved。新增中点及两侧定向测试RED→GREEN，公式与修真回归55/55。内存副本正式恢复8.331秒队列清空，随后100个在线逻辑步均处理0.1秒，无新错误。原档SHA不变。该存档为修仙体系，不能据此认定武道战神图录/神国的未复现报错已修复。

Save75/model2/rule3、RNG/clock/debt合同不变，不清空债务、不改原档、不同步发布版/APK、不commit/push。未做页面/真机/性能准入或全量回归。证据：../../WIS-项目资源/save-formula-blocker-20261107/REPORT.md。

以下为历史记录。
## 2026-11-07 开发版修复：圆环累计时间与锻炼首次预览

开发 build `dev-0.2.0.1-20261107-ring-preview-fix-r1`，可见版本仍为 0.2.0.1；保留上一轮 D12。圆环之理专用 fresh 分支现在显式保留 totalElapsedSeconds；当前转生计时及其它重置范围保持原规则。已被旧版本清除的时间不能从当前存档推算恢复。

自动首次来源预览仍在积压时避让；锻炼无缓存时，完整 J 达到原 10J 门槛即可点击“计算并锻炼”，走已有可续算正式动作，在证明最终收益后才扣款。已知不足1的预览仍禁用；未完成预览不再成为显式动作的死锁条件。正式收益不使用展示缓存。

测试：新增累计时间3项通过（已见RED）；真实浏览器无首预览+0.2秒积压可锻炼，挑战最终收益不足1时完整状态不变（已见RED）。既有10J完整尾项/积压边界浏览器通过。10文件定向回归79项76通过、3项旧圆环rank-basis-invalid失败，移除本次时间修复后同样复现，未改断言。manifest93/Worker78检查通过。数值、RNG、clock/debt、Save75/2/3不变。

武道战神图录/神国的玩家“更新失败”仍需精确错误或报错存档定位；合成夹具成功不等于排除玩家错误。证据与范围见 `../../WIS-项目资源/ring-martial-bugs-20261107/REPORT.md`。本轮不修改发布版/APK，不commit/push；未做全量、真机或性能准入。

以下为历史记录。
## 2026-11-07 开发版D12：超超分形已接入

可见版本0.2.0.1；开发build dev-0.2.0.1-20261107-infinity-d12-r1。D12费用500无限点，前置D11-1/2/3；G额外速度倍率为1+Σc_i·log10(1+x_i)，x_i=Y、Y↑Y、Y↑↑Y、Y↑↑↑Y，c=[0.0001,0.001,0.01,0.1]。四箭头原加成/时间积分不变。通过Infinity.gSpeedMultiplier同源接入正式在线、冻结离线与UI；完整Amount读取用稳定公式，未持有时直接返回1。在线取每步起点库存；离线整个来源锁定起点。费用、里程碑和G/TREE上限、RNG、0.1秒、clock/debt及Save75/2/3不变，无新存档字段。

历史“D12未实施/待比例”记录已被本节取代。节点与付款走现有purchaseLedger/重置退款。两份成熟存档倍率约1.736和1.838；最新G=0存档不提前开G。必要验证64/64，DOM320/390/1280通过；三档未持有D12时前后各10个大数域步骤完整状态SHA一致（非全engine性能门禁）。测试：tests/infinity-d12.test.cjs、tests/infinity-d12-browser.test.cjs。报告 ../../WIS-项目资源/infinity-d12-20261107/REPORT.md。

本轮仅开发版已实施，发布版/APK尚未同步，未commit/push。发布同步请求被自动审批拒绝，需用户明确确认发布范围后再执行。未进行真机、全量或性能准入。

以下为历史记录。

## 2026-11-07 发布同步：0.2.0.1

用户授权开发版、网页发布版与 APK 同步并上传 Git。开发 build dev-0.2.0.1-20261107-release-r1；网页 release-0.2.0.1-20261107；APK release-0.2.0.1-apk-20261107，versionCode 20005（高于已发布 20004），沿用旧测试签名，release 构建关闭 Android/WebView 与游戏调试。

本次只升级显示版本与发布装配，Schema75 / numericModel2 / settlementRule3 不变，包含此前积压阻塞修复与预览异步化。既有严格 Save 往返差异仍未修复，历史失败不计为通过。本轮执行版本、发布转换、原生分支和下载入口验证，不重跑全量数值或性能准入，不宣称手机性能已达标。完整记录见 ../../WIS-项目资源/release-0201-20261107/REPORT.md。

以下为历史记录。

## 2026-11-07 开发基线：实际存档两处结算阻塞修复

Build dev-0.2.0.0-20261107-backlog-blockers-r1，仍为可见0.2.0.0、Schema75 / numericModel2 / settlementRule3，主93脚本 / Worker78。只修BUG，不调整数值合同或调度预算。

- AmountProducts将普通2049–8192位十进制系数按10^2048精确拆行；单行2048位、产品页及总行数限制不扩大，超限仍拒绝，不投影、不截断。完整容量差异清单见CAPACITY-AUDIT.md。
- State.createDraft用私有弱所有权表在提交时解析跨草稿代理，包含未改写的浅拷贝分支；嵌套结果安装到仍活跃草稿的根字段时重新包入COW，避免后续写入绕过事务。完整quantityInputCheck保持不变。测试覆盖层WeakSet逐提交扫描代理，不进入生产。
- 最新实际存档SHA7e081143…的320.316秒队列（online10.310/offline310.006）完整清偿；随后6000个0.1秒在线步骤完成，无代理/stale/容量错误。两个普通存档修复前后各600步全状态SHA逐步一致。
- 验证不是全绿：116文件817项中747通过，70项均在修复前同批复现；其中原55文件集有33个失败条目。附加的严格Save完整字段往返仍失败：Worker20步样本涉及六项统计尾账，对同一导出数据修复前后Save.prepare输出SHA相同。本轮不改Save，也未将该失败计为通过。详REPORT及BASELINE-FAILURES.md。

数值、RNG、clock/debt和失败原子性保持；发布版105个现存文件及原存档不改，不commit/push。未进行性能准入、手机/页面交互或APK验证；不能据此承诺手机不再产生吞吐型积压。证据：../../WIS-项目资源/backlog-blockers-fix-20261107/REPORT.md。

以下为历史记录。

## 2026-11-06 开发基线：通用来源预览后台续算

Build dev-0.2.0.0-20261106-source-preview-async-r1。app.writeSourcePreview 全部来源（含training和修真来源）统一 scheduleSourcePreview；渲染只读缓存/占位，真实paint后创建私有snapshot+FrozenScope+CertifiedRankMath work，3ms软预算和真实timer让出。状态/结构/页面/导入/长按失效完整；保留1s/5s刷新、16/100ms续算、首次积压避让、显式动作同步Preview与锻炼10J边界。SourcePreview.writeRecords仅写已完成records；同步query/write继续供正式显式调用使用，缓存不参与结算。

数值、RNG、事务、clock/debt、Save（75/2/3）不改，发布版/APK不动。页面性能不宣称准入：本轮180游戏秒S2–S5先A/A再A/B，环境不合格与相对指标失败均如实记录。必要回归与7项已在before复现的旧失败见 ../../WIS-项目资源/preview-async-20261106/REPORT.md。其它渲染同步计算仅盘点，不继续优化。P2/H只读诊断已停止，未接入生产；P3拆解见 ../../WIS-项目资源/r-main-read-20261106/REPORT.md。

以下为历史记录。

## 2026-11-06 当前开发基线：在线宿主预算与首次预览避让

开发build dev-0.2.0.0-20261106-online-host-budget-r1。Loop同一宿主任务对同一在线候选只advance一次，deadline为宿主开始+12ms；未完成交下一宿主任务。完整跨宿主输入守卫与原子提交不变。独立deferred action的3ms保留（一次调用后返回宿主）。首次缺失的自动预览在pending≥0.15秒时留占位，积压退出后刷新；显式操作、真实paint机会、长按和已完成锻炼预览10J资格跨界优先更新保留。

同输入600步逐步完整SHA一致（含RNG/clock/debt）；advance5276→1388、来源查询3116→867。最终必要回归82/83，唯一失败为已在before复现的旧pending迁移保护；另8项早期旧基线失败单列，无已确认新增回归。数值、Save、RNG、事务及发布版不变。**性能未准入**：HTTP390环境不合格且host/longtask门槛失败；正式CPU4 A/A波动8.84%，B/ABBA未执行。不能把调用次数减少当作稳定耗时收益。

用户已确认响应性按最外层宿主任务parent===null的完整墙钟计量，p99≤16ms/max≤50ms；单次advance max≤50ms仍是防线，p99保留记录。整页longtask>50ms的B次数和总时长不得高于同窗A；点击100/250ms与其它门槛不变。详见TESTING.md与 ../WIS-项目资源/online-host-budget-20261106/REPORT.md。仅开发版，不commit/push，不继续来源计算优化。

以下为历史记录。

## 2026-11-06 开发版：锻炼10J门槛按钮刷新

开发build dev-0.2.0.0-20261106-training-availability-r1。锻炼按钮此前读取1秒（积压时5秒）的收益预览缓存；完整余额跨过10J时仍可能沿用旧的零收益并禁用。现在每次行动页渲染以正式Resources.canAfford读取完整J余额，跨界时只取消该锻炼预览、清除其冷却并优先可续算刷新；不在每次渲染重算全部收益，不改普通自动预览节流。低于10J立即禁用，达到10J后仍需正式最终收益≥1，挑战等限制继续有效。

数值、RNG、clock/debt、Save及事务不改。开发版已验证，网页发布版仍为app-download-r3，既有APK20004不重包、不修改公开附件。本轮未同步发布目录、未commit/push。报告 ../WIS-项目资源/training-availability-20261106/REPORT.md。

以下为历史记录。

## 2026-11-06 下载弹窗裁切修复 r3

开发dev-0.2.0.0-20261106-app-download-r3；网页release-0.2.0.0-20261106-app-download-r3。下载按钮移到弹窗最上方。按用户截图删除网页下载弹窗中的版本/大小/平台说明、更新说明、安装步骤与国产手机提示；保留存档迁移提示、导出、下载/镜像、桌面QR及SHA。原生“发现新版本”仍保留其更新信息，旧APK不重包。

根因：外层settings-dialog overflow:hidden，新增body没有内部滚动，内容被裁切。body现采用min-height:0和overflow-y:auto；测试验证首屏按钮在弹窗可视范围内且命中点击、底部SHA可滚动到达。清单本身不改，网页发布版保持调试关闭；数值/Save/RNG/clock/debt不变。报告 ../WIS-项目资源/app-download-dialog-fix-20261106/REPORT.md。本轮不commit/push，线上仍需用户部署。

以下为历史记录。

## 2026-11-06 下载入口移至版本号旁，并同步网页发布版

经用户授权，开发build dev-0.2.0.0-20261106-app-download-r2，网页build release-0.2.0.0-20261106-app-download-r2。顶栏版本号右侧显示“下载安卓 App”，设置页不再重复放入口；版本号与入口共同换行，窄屏保持相邻。原生/file/无有效清单仍隐藏，下载说明、UA策略和存档导出合同不变。

网页同步移除调速、公式调试与UI测试入口；保留运营维护的latest.json原字节。线上清单已于本次检查返回200，但线上网页仍为旧g-reward-r1，需用户提交推送后由帽子云部署。本轮不提交推送、不重包APK；APK20004保持不变。数值、Save、RNG、clock/debt不改。验证见 ../WIS-项目资源/app-download-release-20261106/REPORT.md。

以下为历史记录。

## 2026-11-06 当前开发基线：安卓下载入口与更新提示

开发 build dev-0.2.0.0-20261106-app-download-r1；可见0.2.0.0；93主脚本 / 78Worker。schema75 / numericModel2 / settlementRule3不变。发布网页与APK仍为g-reward-r1 / versionCode20004，本轮没有同步它们；发布目录只新增运营维护的latest.json，原100文件保持不变。

- UI.AppDistribution 在设置页提供“下载安卓 App”；同源 ./latest.json 使用no-store读取，404/格式错误/网络失败隐藏入口。Android浏览器提供下载；微信/QQ/WebView提示用外部浏览器；iOS提示暂不支持；桌面提供链接及本地二维码。原生及file页面不显示网页入口。
- 下载说明使用textContent显示远程元数据、HTTPS下载链接、大小/版本/说明/SHA256、安装图文及存档迁移提示；导出调用现有exportSave。二维码为MIT qrcode-generator 1.4.4，仅UI装配，Worker不加载。许可证与来源随vendor保留。
- 原生在首个完整在线结算退出事务后异步读取 https://wispower-3td729n.maozi.io/latest.json；以App.getInfo().build比较实际versionCode，不把清单检查放进数值结算。网络失败静默；有其它对话框/后台时等候展示。“稍后”在设备localStorage按版本保存24h，不进入游戏Save；下载前提醒备份，外部HTTPS导航由现有Capacitor Bridge交给系统浏览器。
- 来源、数值、RNG、事件顺序、clock/debt、Save格式保持。新弹窗导出/关闭按钮沿用设置页的deferred-action放行与暂停恢复规则，不改变购买或保存保护。
- 线上清单本轮读取404。发布latest的APK SHA/size来自20004实际文件；下载URL为用户指定的拟发布路径，未验证附件已上线。publishedAt建立时间待发版时更新。App远程读取需部署允许https://localhost的CORS。报告：../WIS-项目资源/app-download-20261106/REPORT.md。

以下为历史记录。

## 2026-11-06 当前基线：真葛立恒需求下限修正

开发 build dev-0.2.0.0-20261106-g-reward-r1；网页 release-0.2.0.0-20261106-g-reward-r1；APK release-0.2.0.0-apk-20261106-g-reward-r1 / versionCode20004。可见0.2.0.0，schema75 / numericModel2 / settlementRule3保持。

- 用户授权新规则：D6减免、D4除法之后的每阶G进度需求大于1才取^0.95；小于或等于1不变；里程碑倍率的base计价换算在其后。成就描述同步。
- 正式闭式累计费用按需求1的边界分段，覆盖D6低阶段的下降区间、64后的上升区间及真葛立恒挑战；高阶各段仍复用归一化Newton曲线。在线/冻结离线共用适配器，不修改其它奖励与TREE规则。
- G锚点context写入costModel=anchored-v3、rewardAboveOne=true。旧anchored-v2/旧无标志记录先按原曲线结清已消费费用，再以当前阶位、剩余资金及acc重锚；不追溯返还消费、不凭旧累计投入补发。存档外层格式不变；保留旧精确内核与旧曲线用于历史记录转换/诊断。
- 三版本保留G/TREE科学计数显示。网页/APK继续移除调试UI，APK用release变体并沿用经授权的旧测试签名，不上架。模拟器userdebug强制WebView端口限制沿用上一轮说明。
- 定向测试、断言变更及交付：../WIS-项目资源/g-reward-floor-20261106/REPORT.md。未运行全量及性能门禁。

以下为历史记录。

## 2026-11-06 网页与 APK 发布资源同步

用户明确授权同步发布版。开发真源仍为 dev-0.2.0.0-20261106-martial-shroud-r2；网页构建 release-0.2.0.0-20261106-shroud-r2，APK资源构建 release-0.2.0.0-apk-20261106-shroud-r2，versionCode20003。发布资源移除调速、公式调试、UI测试入口，速度固定×1；Android采用release变体、debuggable=false、WebView调试显式关闭。经用户确认沿用原测试签名，支持旧包覆盖升级；不代表已配置正式长期发布密钥。未上架或公开部署。

本轮新增内容和数值合同保持；详情及验证见 ../WIS-项目资源/release-shroud-20261106/REPORT.md。

G/TREE 阶位共用 UI.Format.rank：小于1000显示整数，达到1000改用科学计数法，高层沿用 e/ee 递归显示，残差项保留；纯显示，不改变阶位/存档。模拟器 userdebug 系统会强制开启 WebView 调试（Chromium133），不代表 APK 开关开启；普通真机尚未验证。

## 2026-11-06 当前开发基线：秘境流化龙与仙台

Build `dev-0.2.0.0-20261106-martial-shroud-r1`，可见版本 0.2.0.0；schema75 / numericModel2 / settlementRule3；91 主脚本 / 78 Worker。只更新开发版，未同步发布版，也未重新打包 APK。

- 四极成就开放帝经、圣体、神王体、源石四种烙印，按实际正向战力/体/体/J 入账独立累计；沿用正式闭式批量、宝物 award、挑战保留和无限重置规则。替换余额、扣款、读档、预览不计进度。帝经只乘武道体与招式战力来源；源石只乘武道气的 J 来源；圣体/神王体进入体/气获取倍率。
- 化龙九变 9 级：体门槛 2e6、神魂价格 2e5，每级均翻倍；打岩倍率 5^L。化龙成就开放同名挑战，挑战仅秘境流能力有效/可购，基础转换保留；当前解锁 Lv1 完成。奖励令倍率提升至 1+0.03log10(1+体) 次方，不自动解锁打岩。
- 登仙台需化龙 Lv9、体 1e9、心 1e5，消耗神魂 2e8。按用户确认的累计转换合同，E=1+0.025log10(1+心) 接入 P(v)=0.25v^(2/E)+0.75v^(1/E) 的边际成本，乘原神魂衰减后分段积分；库存不重发，指数取本次输入快照。支持凹幂段的稳定反解；手动、自动、预览共用，离线仍冻结起点边际速率（零神魂且 E>1 时该起点速率为0）。
- 仙台成就开放仙三斩道：最终正向 J/战力速率为稳定的 sqrt(1+g)-1，锻炼单次收益同样受限，目标引用现有 Config.scales 地表 3.2e25；一次完成后登仙台系数变为0.04。
- 新能力、成就、挑战资格、宝物记录复用已有存储；旧档补零，不提升存档版本。事务、失败回滚、RNG、事件顺序、0.1s、clock/debt 不改。
- 验证及已知旧测试失败见 `../WIS-项目资源/martial-shroud-20261106/REPORT.md`。本轮不作性能提升声明，不跑性能全矩阵，不构建 APK。

以下为历史记录。

## 2026-11-06 APK 开关显示修复 r2

当前build dev-0.2.0.0-20261106-apk-backup-r2，可见0.2.0.0，APK versionCode20002。settings-toggle开启样式优先级高于通用secondary-button:hover，并使用中央主题前景色；修复点击后白字浅底。删除用户指定的“每次新增时间戳文件……”说明段落。备份调度、权限、存档和数值合同不变。8组触屏/鼠标、深浅主题测试及原备份UI回归通过；发布版不变。报告 ../WIS-项目资源/apk-toggle-fix-20261106/REPORT.md。

以下为历史记录。

## 2026-11-06 当前开发基线：APK 本地自动备份

build dev-0.2.0.0-20261105-apk-backup-r1；可见0.2.0.0；schema75/model2/rule3、91主脚本/78Worker不变。独立WIS-App versionCode20001，猫咪图标使用用户提供120×120原图确定性尺寸适配。

- APK设置增加本地自动备份：玩家选择并授权目录后启用，间隔6/12/24小时，默认6小时；前台每30秒检查，启动/回前台同样检查，到期只补一份。没有后台常驻服务。
- 自动和手动目录备份共用原导出capture/clone/Save.envelope文本；读档未就绪、临时保护、导入中、恢复锁定时推迟。数值、RNG、clock/debt不变，不强制新结算。
- 设备配置与目录URI持久授权由WisBackup插件SharedPreferences保存，不进入游戏Save；导入游戏档不会改变目录/间隔。网页端不启用。
- 每次新增时间戳JSON，不覆盖/不自动删除旧档。写.partial→关闭流→SHA256/长度读回校验→rename.json→提交成功时间；失败保留旧备份与原成功时间，5分钟限频重试；被杀可能留下不算成功的.partial。
- Android系统目录选择受SAF限制，建议Documents/WIS子目录；卸载后外部文件保留但授权/设置需重新选择。原Share手动导出保持。

必要验证和实际模拟器结果见 ../WIS-项目资源/apk-backup-20261105/REPORT.md。无真机、无发布签名、不做全量或性能门禁。发布版及原玩家存档保持不变。

以下为历史记录。

## 2026-11-05 当前开发基线：0.2.0.0 / Android 适配 r1

build：`dev-0.2.0.0-20261105-apk-r1`；可见版本 **0.2.0.0**；schema75 / numericModel2 / settlementRule3 不变；91 主线程脚本 / 78 Worker 脚本。保留 C7、武道扩展和闭式 r2 的全部合同；D12 未实施。

- 新增 UI.NativePlatform（主线程）：仅 Capacitor.isNativePlatform() === true 时使用 App / Filesystem / Share；导出与网页共用同一 envelope 文本，Cache UTF-8 写入后分享，失败明确提示。保护模式原始存档导出及启动失败面板也保留原文。
- Android 返回键优先关闭现有对话框（保留 cancel 合同）；无对话框时两次返回退出，退出前走 pagehide 同一保存路径。失败、未就绪、导入冻结或受保护会话拒绝退出；提示条不拦截第二次返回。
- 原生 appStateChange 与 document.hidden 合并为同一可见性输入，复用 Loop 暂离/恢复/保存逻辑；重复事件不重复计时。网页默认输入不变；RNG、正式结算、clock/debt 和存档格式不改。
- 原生启动检查私有字段语法，过旧 WebView 明确提示更新；首次启动提示 App/网页存档隔离及卸载风险。提示标记独立于游戏 Save。
- sync-release 支持 --out / --build / --dry-run；版本、Schema、结算规则从 config.js 读取。路径规范化防止 Windows 大小写或链接别名覆盖开发真源。默认 --write 行为仍指向发布版，本轮未执行它。
- 独立工程 ../WIS-App：com.wis.game / 无限战力系统，minSdk24 / targetSdk36，HTTPS localhost，竖屏，versionCode20000。工具链和证据均在 E 盘。

验证与交付详见 ../WIS-项目资源/apk-0200-20261105/REPORT.md。本轮不做游戏页面性能准入、CPU4 或全量回归；页面性能仍待干净环境 A/A + ABBA。用户确认暂无线下真机，本轮先交付调试 APK；发布签名由用户本人生成和保管。

以下为历史记录。

## 2026-11-05 当前开发基线：无限强化 C7 r1

build：`dev-0.1.8.4-20261105-infinity-c7-r1`；schema75/model2/rule3、90主线程脚本/78 Worker脚本不变，保留上一轮全部武道扩展。

- C7-1「体系重置」、C7-2「体系切换」均为C6后的同级强化，各500无限点，一次购买后重复操作不收费。在体系界面主动点击并确认执行，不是周期自动重置。
- 重置清当前体系资源余额/尾项、境界、普通能力、自动化进度与开关；切换同时清离开体系与目标体系的残留进度。保留J/战力、PowerSystem、大数、共享meta（宝物/无限/高阶多元/成就/挑战奖励）、RNG/clock/debt及历史统计。历史资源total/spent/peak完整数量保留；仙道persistent永久重修/灵根与宝物派生资格不清。
- 仙道切换沿用大乘成就奖励，真实选择次数加1；其它历史统计不清零。永久天宝/玄天宝/五行至宝资格在候选准备中按正式归一化恢复，避免内存与存档重读差异。普通能力仍清空。schema无变更，不需要新迁移字段。
- 普通/体系/大数挑战及外层圆环挑战期间拒绝；离线恢复锁定期间UI禁用。操作先完成私有候选准备再安装，取消在途预览/玩家动作，走既有保存入口。
- 最终C7定向9/9，合并上轮武道22项为31/31；真实页面1280/390/320三组通过；最终Worker生产装配读取两份真实存档，内存副本重置/双向切换与全字段保存往返一致。相关旧Infinity回归20项6通过、14失败，before快照逐项同样复现，无新失败、未改断言。manifest/Worker检查通过，发布版93文件与原存档不变。
- D12「超超分形」的贡献比例仍待用户选择，本轮没有新增D12节点或改变G结算。未做全量、性能门禁、CPU4；页面性能仍待干净环境A/A+ABBA复测。

报告：`../WIS-项目资源/infinity-c7-d12-20261105/REPORT.md`。复现：`node --test tests/infinity-c7.test.cjs tests/martial-expansion.test.cjs`；页面：`node tests/infinity-c7-browser.test.cjs`（Playwright及TEMP/TMP均用E盘）。

以下为历史记录。

## 2026-11-05 当前开发基线：武道扩展 r1

开发 build：`dev-0.1.8.4-20261105-martial-expansion-r1`；可见版本 0.1.8.4；schema75 / numericModel2 / settlementRule3；主线程90脚本、Worker78脚本。沿用统计页修复与闭式批量 r2；页面性能仍待干净环境 A/A + ABBA 复测，本轮未作性能准入。

- 能力共49项：新增战神图录、神劲、识海星球（3级）、命核、体内世界、神国、彼岸、道宫、四极。既有能力数值不变。
- 战神图录：长生诀/天魔策/慈航剑典前置，心≥1000，神魂费用5000，不占内功槽；正式累计/边际成本中目标资源自身全部衰减幂×0.5。支撑资源的投入坐标不改，UI与正式结算共用阈值。
- 神劲：丹劲/易髓/内三合成就前置，体≥10000、心≥1000，神魂费用3000；仅体独立来源曲线的基础指数1.25→1.50，保持体=1时来源2及明劲/暗劲/化劲/嫁衣等后续关系。见神不坏成就只解锁秋风挑战。
- 秋风未动蝉先觉：永久入口资格；只停用心对普通J/战力量级软上限的缓解，心其它用途保留。目标体20000、心2000、J3.033e16、战力3.033e15；一次完成，心获取×50。
- 识海星球和体内世界的每秒基础投入，经过现有获取倍率、完整 Amount 累计成本及衰减。在线按0.1秒起点准备、结尾入账；真离线按当前合同冻结起点边际最终速率，沿用既有自动化冻结规则。
- 命核只强化体来源；神国经 regionExponent 作用于全局J/战力获取，四资源（含神魂）参与依赖。彼岸/道宫只强化已购买的对应能力。四极按用户确认对元素化/极意各自完整正向来源收益使用 sourceExponent；未购买仍为0。
- 源能法则成就解锁第20种宝物烙印·法则：实际气/体收入合计为进度，第n枚需求1e5×2^n；基因源能倍率额外×√(1+n)。进度由私有候选的实际正收入收据产生，不从可能向下压缩的历史total差值反推；预览不提交，资源与宝物失败共同回滚。复用现有闭式宝物、公共award和重置规则，不参与时间周期产出或普通需求折扣。
- 无新增顶层存档结构：新键使用现有能力/成就/挑战/永久资格/宝物映射，旧档新增库存默认0；保存格式版本不变。真实schema72原档及2026-11-05存档读入→保存→重读，State.toSerializable逐字段一致（忽略0字段）。旧pending recovery保护沿用现行合同。

验证：最终必要Node回归117/117（其中新增22项）；真实DOM 1280/390/320三组通过；Worker/local在线和离线、开启/未开启心支付奖励四组全状态/RNG/debt对照通过（仅排除两个主机绝对时间戳）。manifest和Worker检查通过。另有旧gang-dan的Amount投影断言、旧UI分支标题断言在before快照同样失败；旧qi-power-goal缺失外部存档夹具，未完成。未跑全量、长时平衡、性能ABBA或CPU4。详情：`../WIS-项目资源/martial-expansion-20261105/REPORT.md`。

以下为历史记录。

## 2026-11-05 统计页最高量级显示修复

开发build更新为 `dev-0.1.8.4-20261105-statistics-scale-r1`。闭式r2数值基线、schema75/model2/rule3不变，页面性能仍待干净环境复测。

“最高量级”原先仅索引旧战力量级表，末项为宇宙结构。现在优先读取已有高阶多元阶位/历史记录及修真道历史最高境界，显示高阶多元、多元宇宙、单体宇宙；未达到时回退原量级。查询不依赖当前体系、封印或当期库存，转生后历史不回退；不新增存档字段，不写持久状态。

验证：统计页面1280/390/320各28场景通过（含11个新增量级场景）；原玩家N^132存档显示高阶多元，渲染前后完整状态一致；8项境界统计及UI只读边界通过。额外高阶多元保留套件5项rank-basis-invalid，修改前覆盖层同样复现，未改其断言；详情 ../WIS-项目资源/statistics-scale-20261105/REPORT.md。未跑全量或性能测试；发布版、原存档不变。

以下为历史记录。

## 2026-11-05 当前开发基线：闭式批量 r2，空尾项迁移修复已接入

开发 build：`dev-0.1.8.4-20261105-closed-form-r2`，可见版本0.1.8.4；schema75 / numericModel2 / settlementRule3；主线程90脚本、Worker78脚本。尾项策略 directed-tail-32-8-24-v1 不变。准入状态：**数值已验收、页面性能待干净环境ABBA复测**。以下历史“已回滚”条目只描述当时结果，本条为当前基线。

### 当前数值与迁移合同

- 19种宝物、探寻自然奖励、G全部规则（含trueGraham）、TREE raw/boosted/single 使用全期闭式批量；状态为Decimal锚点n0、价格上下文、累计投入F和补偿acc。价格由计数与锚点上下文推导；保留来源封顶、历史award/FIFO、里程碑、phase/D11、maximum/limit和事务原子性。原精确内核保留但不作为这些闭式领域的批数求解路径。
- layer0采用TwoSum比较存储的二进制F与acc；layer0/1按表示坐标ε²、layer≥2按ε（ε=2^-52）判可丢弃收入。acc进入存档。低于表示精度的收入不再承诺无条件最终生效；停滞按10游戏秒UI.Format显示变化检查。<1e12计数按整数/差1合同，≥1e12按Decimal精度及授权相对1e-12测试；余额非负、非法/负费用不能免费、计数单调。
- G最终Decimal费用与Newton采用同锚点和scale，局部正负各最多2次校正，正常费用评估≤6；只在Newton不收敛时有界二分并计数。费用评估之间通过现有3ms合作预算挂起，候选完成后提交；单次费用/GC不保证可中断。
- R类资源精确模型、RNG、同一步事件顺序、0.1秒节奏、clock/debt不改；R下游时机差异按amendment5的Δt/δ≤1秒及终值相对≤1e-8验收。宝物采用累计发放相对≤1e-9或时差≤1秒的OR口径，不能将其误写成所有宝物时差均≤1秒。
- 旧schema72或model1/rule2无未完成恢复任务时，首次加载投影为普通Decimal、向下校验，acc=0，保存为model2/rule3。空treasureStockResidual/treasureProgressResidualTail键由publish删除，不写[]；Save.sparseData不变。真实旧档迁移后State.toSerializable→保存→重读逐字段完全一致，忽略字段数0。
- 旧版本pending recovery不能直接套用新规则：以CLOSED_RECOVERY_PROTECTED显式保护，原存档不变、自动保存停用；需用旧版完成到可转换边界后再加载。新版本没有自动执行旧规则的兼容执行器。同步/分片、暂停/未暂停四组合均验证；注入迁移异常也保留原文并禁止自动覆盖。
- 既有0.15秒积压预览节流（5秒刷新/100ms续算）、冻结前私有品牌/缓存槽、外部数组WeakMap回退保持不变。

### 本轮验证与开发规范

61/61闭式及阶位定向；指定55文件242项228通过、14已知失败、新增0；7项实际迁移/保护检查通过；原存档E/O各6000步（600秒）按授权口径通过。装配--check通过，发布版93文件、原存档、AGENTS.md不变。完整报告：../WIS-项目资源/closed-form-sparse-20261105/REPORT.md；空值审计SPARSE-AUDIT.md，断言改写ASSERTION-CHANGES.md。

新离散机制不得由ee级巨大数之比推出小离散结果；按数量指数涨价机制使用闭式批量；新公式统一走AmountFormulas或稳定helper，差分类禁止直接相减。性能比较只使用同窗口A/A+A/B，不与历史绝对值比较。

页面复测沿用 ../WIS-项目资源/closed-form-reentry-20261105/REPORT.md 与CRITERIA.json：记录并安全暂停已授权非WIS高负载进程，结束恢复；前60秒CPU mean≤10%、p95≤15%；固定起点A/A均值差≤5%后HTTP390/600 ABBA，B均值降低≥25%且原全部门槛通过（mean/完整生命周期<100ms、p99≤16ms、max≤50ms、pending≤0.2s、点击/债务门槛），再补40步、HTTP320/1280、file430，CPU4仅记录。**本轮未运行页面性能、CPU4或全仓库全量测试，不宣称性能准入。**

以下为历史记录。

## 2026-11-05 正式接入尝试未完成：迁移完整状态往返失败，已回滚

当前仍为 `dev-0.1.8.4-20261103-row-brand-r1`，schema75/model1/rule2、主84/Worker72。用户已授权闭式合同及跳过本轮页面ABBA前置条件，但本次model1→2首次迁移后保存重读会省略38个空宝物尾项键（19个stock、19个progress），未满足完整状态一致要求，因此按失败规则回滚；其余字段值一致。闭式版不能标记为已正式接入。

本轮59/59定向、55文件242项228通过/14已知失败、新失败0。新600秒轨迹在迁移失败后中止（E2120步、O3840步），实际旧pending recovery专项保护验证未执行完；不得把上一轮完整轨迹结果冒充本轮完成。页面性能、CPU4、全量测试均未运行。报告与差异：../WIS-项目资源/closed-form-adoption-20261105/REPORT.md、MIGRATION-DIFF.json。

闭式修复版及授权合同仍留在资源目录：宝物/探寻自然奖励/G/TREE全期闭式；model2/rule3；锚点、投入F与acc；layer0/1按坐标ε²、layer≥2按ε判可丢弃；R类终值1e-8。它们尚未重新成为当前运行基线。修复迁移并验收后，接入状态应为“数值已验收、页面性能待干净环境ABBA复测”，不能写成页面性能已准入。

### 面向新增内容的开发规范

- 新离散机制不得用ee级巨大数之比推出小离散结果；须在可分辨的坐标中定义。
- 按数量指数涨价的机制采用闭式批量设计，保留付款、边界和事务检查。
- 新公式统一走AmountFormulas或稳定helper；差分类公式禁止直接相减。
- 性能只做同窗口A/A+A/B比较，不与历史绝对耗时直接比较。干净环境、固定起点和AA/ABBA复测指令见 ../WIS-项目资源/closed-form-reentry-20261105/REPORT.md 及同目录CRITERIA.json：前60秒CPU mean≤10%、p95≤15%，AA差≤5%；HTTP390/600 ABBA，B均值降低≥25%且原均值/完整生命周期、切片、pending、点击与债务门槛全过，随后补其余矩阵。该复测未在本轮执行。

以下为历史记录，以本条当前状态为准。

## 2026-11-05 闭式重新接入：数值通过，环境/A/A未通过，已恢复基线

当前业务仍为 `dev-0.1.8.4-20261103-row-brand-r1`，schema75/model1/rule2，主84/Worker72。闭式修复试验版已归档，未成为当前生产路径。报告：../WIS-项目资源/closed-form-reentry-20261105/REPORT.md。

试验修复共尺度G局部校正与费用间可续算准备；84个页面G输入3–5次费用评估、无二分；59/59定向，55文件242项228通过/14已知失败、新失败0；E/O各600秒按本轮授权口径通过。宝物采用累计发放相对差或时差的OR判据，不代表所有宝物时差均≤1秒。

页面A/A固定经济起点相同，但均值61.842/77.547ms，差22.533% >5%；测试前CPU mean/p95分别9.758%/15.656%、16.529%/37.733%，均不合格。只作诊断，未进入ABBA或B后续矩阵，不能宣称试验版提速/变慢。两项暂停研究进程已恢复。按未准入保留基线的约定恢复后7032文件SHA匹配，再单独同步本条及README/TESTING；发布93文件和原存档未变，无commit/push。

### 当前性能测量规范

记录非WIS高负载进程的PID、创建时间、脚本路径，安全且获授权时NtSuspendProcess，finally用同身份NtResumeProcess并记录；无法安全暂停的跳过说明。每轮前完整60秒主机CPU均值≤10%、p95≤15%，否则仅诊断。使用baseline-env固定启动恢复覆盖层，保留原始绝对时钟，比较同一经济起点。必须先同窗口A/A均值差≤5%再A/B；环境/起点不合格不作为准入；禁止直接与历史绝对耗时比较。门槛mean/full<100ms、p99≤16ms、max≤50ms、pending≤0.2s及点击/债务斜率不放宽。

以下保留历史基线与记录。

## 当前实现与最终验收入口（2026-11-03）

统一基线见AGENT_CONTEXT.md首条：G/TREE显式近似、0.15s积压预览节流、冻结前声明私有品牌/缓存槽及外部数组WeakMap回退。最终业务字节与C3相同。本轮55文件宽回归221通过/14已知失败，无新增回归；HTTP1280/file430仍有58/68.4ms长切片，完整矩阵未通过。CPU4原交互门槛通过，但末积压7.058s；未验证GC归因/全程降速吞吐，不继续优化。详见 ../WIS-项目资源/final-baseline-validation-20261103/REPORT.md。

以下为历史实现说明，当前状态以上述统一基线为准。

## 2026-11-03 C3：对象内私有缓存槽

业务仅amount-products.js：canonical row七缓存、factor两缓存及品牌、finalized数组四缓存迁入冻结前声明的私有槽。外部encodedInputs/normalizedInputs WeakMap及逐元素校验保持；owner/work/RankBudget/Amount表不动。裸系数直接算键不补章。原型/own keys/descriptor/序列化、防伪、数值/RNG/clock/debt/Save保持；build id仍row-brand-r1，以源码/Worker SHA区分C3，Worker72 SHA前缀23d3e63f2b4ad469。

必要Amount/Rank9文件96/96；新增amount-object-cache覆盖冻结后写既有槽、模拟拒绝晚盖章、null缓存及外部数组失效；engine原档8步完整状态SHA逐步一致。单次HTTP390600诊断MajorGC max/p95 112.598→47.899ms，总计825.559→374.735ms，次数11→14；总分配采样1.232→1.248GB未下降。正式40/320600/390600各一次通过，均值74.220/53.809/54.876ms，p99 6.7/7.0/7.1，max20.7/19.7/17.8ms，pending0.087/0.024/0.041s。不代表多轮稳定；未跑其余矩阵/全量、不扩范围。发布/原档保持，无commit/push。报告 ../WIS-项目资源/object-cache-20261103/REPORT.md，下方历史保留。

## 2026-11-03 canonicalRows私有品牌，性能目标仍未达到

开发build `dev-0.1.8.4-20261103-row-brand-r1`，84/72；schema75/model1/rule2/尾项及G/TREE合同保持。本轮只将amount-products.canonicalRows身份WeakSet替换为不可反射复制的语言私有品牌，canonical/negateRow在freeze前标记plain object。原型、own keys、序列化/防伪不变；negativeRows及其它缓存、owner memo未动。

新增amount-row-brand测试及相关8文件93/93，engine原玩家8步每步完整状态SHA一致。C1单次HTTP390600及C2相同诊断：第299/301步堆快照；canonicalRows原13755/13805条为首位，C2该表消失。区间外MajorGC max/p95 186.947→112.598ms，次数7→11，累计843.5→825.559ms；分配采样估计未下降，快照会扰动GC，不能证明稳定收益/逐表因果。

正式40/HTTP320600/HTTP390600各一次，前两组通过，390因max99.5ms失败。均值95.410/72.538/77.683ms，pending0.112/0.047/0.042s。未达到MajorGC<50ms或完整三组准入，不扩大弱表改动、不重跑挑结果；未跑全量/其余矩阵。发布和原档保持，无commit/push。详见 `../WIS-项目资源/heap-identity-20261103/REPORT.md`，下方历史保留。

## 2026-11-03 积压预览节流，性能门禁仍未通过

开发build `dev-0.1.8.4-20261103-preview-backlog-r1`，84/72装配；schema75/model1/rule2/尾项和既有G/TREE近似合同保持。app.js只读pendingContinuousTime.clock合计，>=0.15s时自动dirty重试1s→5s、在途自动预览16ms→100ms、自动发布走常规render。首次/显式/程序性刷新保留原调度，hold保持；退出节流区间触发一次最终刷新。仅UI闭包状态，未写正式state/RNG/clock/debt。

B1唯一HTTP390/600诊断复现64.3/98.1ms长切片，与主线程GC重叠57.995/91.068ms；第三段16.9ms含宝物入账观察区间。trace不是准入，也未证明分配来源。B2无trace正式40/HTTP320600/HTTP390600均值96.205/70.676/79.484ms，p99 7.7/8.7/9.3ms，max60.6/171/74ms，pending0.139/0.071/0.203s；三组均未完整通过。HTTP1280/file430/CPU4按前置门禁未执行，不计通过；尚未证明稳定提速。

限定测试22项通过，roam-spirit-world-preview:27 `assert(committed?.completed)`在新旧app均失败，原断言保留。真实吐纳first-paint与完整state只读通过；未跑全量。发布93文件、原存档不变，无commit/push。报告 `../WIS-项目资源/preview-backlog-20261103/REPORT.md`，下方为历史。

## 2026-11-03 G / TREE 显式近似边界

`meta/rank-settlement.js` 的私有 settleG 同时服务 advanceG / frozenG。用户授权的新合同只在步起点 `Number.MAX_SAFE_INTEGER (=2^53−1) < G < 1e300` 且非 trueGraham 生效；跨入阈值的精确步完成后，下一步才按新起点选择近似。逐整数认证仍用于其它区间及异常/不足资金/零limit回退。

费用量级为 Decimal，批数由归一化 double 多项式或8项 Euler–Maclaurin（reward+D6附12项二项展开）选取；稳定积分初值覆盖 n≫G，Newton上限16。Q有理扣款以**表示出来的近似费用**为权威，精确验证 affordability、非负余额，成功新record.cursor=0。不是对旧真实费用的逐整数证明；四规则实测批数差≤1e-13×批数+1。旧符号余额保守投影乘有理1−1e-14并用Q验证向下，不安全则精确回退，不扩大折损系数。

TREE D11-1 income 使用 treeTimeExposure 的稳定差分式投影收益到Q；elapsedBudget继续精确累加。rationalTree仅处理符号funding/initialFraction，保守重锚当前目标，raw放funding，boosted小于1放initialFraction、银行余额≥1放funding，向下性无法确认保留旧record。典型重锚误差约1e-15，exposure对照≤1e-14；靠近阶位边界可相差一个逻辑步，小余量的相对差可能放大。raw/boosted/single/bank均接入，原事务及取消路径保持。

G持久显示仍由精确预算派生：normalize对已有gBudget不再用旧ledger再次舍入显示；validate只接受原投影或其合法序列化/解析表示，再恢复投影。没有数值容差或预算重写。schema75/model1/rule2/尾项/RNG/clock/debt/宝物/其它资源公式保持；本次是明确授权的阶位数值合同变化，不能引用下方历史“纯等价优化”描述新行为。build rank-approx-r1，84/72装配。

## 2026-11-02 在线准备结果的私有交接

开发build online-prepared-results-r1。TreasureProgress私有prepareAffordableLedger在原成功边界返回冻结count组件/debitWords；ordinary结算直接扣该费用，公共affordable仍返回独立Decimal。费用和count不跨owner/candidate/reset传递，不存入state；legacy、边界校正、pending与precision保持。

FixedSources的Amount银海先获取完整quantity，再在原阶段内投影rate；仍由既有冻结scope/once/task管理，没有拆preview或绕过cap/earned。RankExact新增私有prepareExact：exact走既有read，其他值走原normalize；仅用于estimate/log/project，不提升品牌作用域。productPower只读分离检查用wordView，公开words副本保持。

本轮仅复用已完成准备，无新广义缓存/精度政策。Step/Loop/TREE生产文件未改，完整guard与3ms/12ms预算保持。完整生命周期与host计量通过测试夹具源码变换和test-only helper实现，不进入主84/Worker72装配。性能短测仍失败，详见AGENT_CONTEXT最新节。

## 2026-11-02 成就呈现、轻量顶栏与公共准备阶段

当前开发build redundancy-reduction-r1。Loop未完成切片不再计算无人消费的成就before快照或触发notify；已确认推进仍通知，独立UI渲染请求保留。启动、导入、离线恢复只删除无用快照，原完成/暂停条件保持。

BigNumbers.headerSummary仅返回当前普通/G/TREE显示分支所需字段，沿用原公式；UI顶栏使用该只读摘要，完整TREE页继续使用原视图。没有新的跨候选缓存。

Amount.fromParts把同一次私有输入的完整键传给内部规范化，floor借用私有不可变词组；RankExact区间memo/task共享原完整键，同因子指数只解码一次。公共words/可变副本合同不变。

FixedSegment.prepareProfileStages提供唯一业务阶段体；同步driver维持原外层state/frozen scope，分片driver维持私有snapshot scope和子work。两个入口统一旧参数拒绝；原BigNumbers同步/工作入口、取消/失败清理、提交和TREE super回滚保持。原数学、RNG、0.1秒及clock/debt合同未改。限定验证及性能失败见AGENT_CONTEXT最新节和本批REPORT。

## 2026-11-02 奖励费用、系数归并与G准备

当前build reward-coefficient-r1。meta/treasures的费用体显式接收选定规则；affordableLedger任务只保留脱离候选的Amount、冻结词组及标量组件，依次保留已完成的费用与比较。每次返回新的Decimal，禁止跨reset捕获状态后代。

amount-products使用无歧义整数系数键及精确BigInt容量比较，复用私有空因子/工作行。≥32项组以8项循环单元续算；真实2～21项小组的过细分片曾增加外围重入，已撤回。G费用保持原分段/运算顺序，仅在分子（或固定定价段）、指数及最终组合间保留结果；特殊G不重复嵌套费用任务。TREE super回滚保持。仍有不可抢占BigInt/排序/GC，不能承诺硬时间上限。性能短测未准入，详见../WIS-项目资源/reward-coefficient-preparation-20261102/REPORT.md。

## 2026-11-02 来源内部续算边界

Effects.runFrozenSteps在既有createFrozenScope内保存未完成阶段；身份由私有Symbol及scope决定，不建立输入字符串键。thunk在generator外执行，挂起不关闭迭代器，非挂起错误/完成清除；普通和interval调用同步执行，不跨可变输入复用。

Immortal.buildEffects使用逐描述符阶段，保留动态value函数和原顺序。Formulas.sourceQuantity/regionQuantity同步drain同一sourceQuantitySteps/regionQuantitySteps；这些Steps由私有不可变输入owner持有。Scale仅在原quantityStageMemo的total/normal接入profile独立游标。TREE super回滚、Step完整输入检查及数值规则未变。开发build source-continuation-r1，84/72脚本；本次短测通过不代表完整性能准入。

## 2026-11-02 当前六方向工作复用边界

当前dev-0.1.8.4-20261102-online-six-stage-r1。来源冻结scope保留group输出和逐字段准备；RankBudget会话费用memo只从已接纳记录继承到费用规则不变的funding/cursor副本，关闭清理。有限奖励task只缓存纯准备，投影保存不可变组件，每次独立构造Decimal。显式TREE逐字段保留私有工作进度，超构造/冻结TREE仍走原回滚；未降低Step原地修改检测。规范行取负和同分母归并保持原规范顺序与容量；外部输入无信任标记。

仅必要定向测试通过，最终40步浏览器性能短测仍失败，未证实稳定提速。完整范围见AGENT_CONTEXT最新节及online-six-stage-20261102/REPORT.md。下方为历史说明。

## 2026-11-02 当前在线准备与提交边界

当前 dev-0.1.8.4-20261102-online-work-reduction-r2，75已启用，84/72脚本。Resources私有操作保留同步接口，在线以纯准备→一次应用；修真按资源保留阶段，探寻初始化一次。CertifiedRankMath.createNumericScope仅共享当前提交的纯数值准备，任务迭代器/结果保持独立，关闭或失效不可再用；不序列化，不跨候选缓存收益。State.createDraft的replayable供内部奖励重试，reset后重新读取后代。TREE复杂回滚保留。精度、曲线、RNG与时间合同不变。

当前功能641/42/13通过，原600步性能三轮仍未准入；不是稳定提速或所有同步风险消除。详见AGENT_CONTEXT最新节及本批报告。下方旧日期为历史说明。

## 2026-11-02 当前私有加载与标量证明边界

当前开发dev-0.1.8.4-20261102-reopen-throughput-r2，75模型启用。Core.State.isSealedLoadInput(value)只查询当前load私有封存树，JSON/Object.freeze不能伪造；关闭scope后不再可信。容器校验、RankBasis.assertSerialized及RankBudget.create/read可在该私有作用域保留阶段；所有对象创建参数都须封存，保留结果冻结，公共可变调用继续新鲜验证。normalizeDomain借用封存输入只读，mergeKnown生成独立输出容器。

AmountFormulas/AmountProducts标量、符号和备用投影可从32位有向区间证明开始，无法确认同一唯一结果则使用原80/160/320/512；Legacy入口和尾项系数压缩仍80位开始。没有新数值格式/求解器/跨候选动态缓存。Step输入守卫每片仍验证值/组件/原型/自身字段顺序，采用for-in及hasOwn过滤避免分配键数组。

性能：当前75重复读取约0.27秒；在线三次平均79～97ms但max65～260ms，完整门禁尚未通过。最新REPORT优先于下面历史版本表。

## 2026-10-31 当前阶位运行时装配

开发build `dev-0.1.8.4-20261031-rank-runtime`，Schema74、78主脚本/66 Worker。SignedLedger后依次为Rank、RankMath、CertifiedRankMath、RankProjection、RankExact、RankGCost、RankBudget、RankBasis、RankSettlement，再接原消费者。下述旧日期段记录历史装配，以本节和版本轴为当前值。

RankBudget提供单work私有会话/严格外部读取/精确付款，RankSettlement负责固定原单位和派生字段；BigNumbers共享同步与分片阶段内核，FixedSegment持有子work，Step拥有候选会话。Loop复用原host预算并避免无提交重复渲染。UI只读已确认投影；旧73读取/校验与原求解器退役边界保持。详见AGENT_CONTEXT与本批E盘验收，未改发布版。

## 2026-10-30 当前结算装配

开发主清单69脚本，Worker57成员。StableProductQuotient紧随BigNum；LegacySettlementCheckpoints在ResourceGroups/PredictorGroups/State之后、CheckpointStrategy之前。PredictorGroups仅保留旧checkpoint所需元数据注册；数值拟合/区间/执行器不装配。CheckpointStrategy保留预算校验、复制、冻结accept与历史计数；旧plan入口明确拒绝。FastForward仅提供现行宝物bulk/cache与无副作用兼容查询。17个退出装配的文件为报错占位，无旧求解体；未来sync-release定向排除，本次发布目录未改。

Rank/RankMath/CertifiedRankMath/RankProjection/RankExact/RankGCost/RankBudget/RankBasis/RankSettlement九模块均未装配，正式Schema73保持。State/Save的未来版本迁移分支和旧读取映射已通过隔离夹具；已登记配方的跨内核旧单位认证通过；局部计数证明、内层续算与正式UI验收仍不足，不能仅改Config开启74。固定预算见rank-fixed-budget-20261030；当前迁移、消费者清单和未过准入见rank-schema-migration-20261030/VERIFICATION.json。本轮未来版本费用因子、UI与普通G/raw及boosted TREE实际状态适配已接入隔离夹具；新认证G挑战/奖励核、几何费用表达式和D11累计曝光已隔离接入；未知历史后端、极端成本容量、内层续算和未来正式浏览器生命周期仍待，全部通过前不得加入index/Worker。

# WIS 开发版模块说明

当前基线：WIS 0.1.8.4（2026-11-01：按用户明确要求，主体与尾项模型75已在开发版启用，已知性能问题后续处理），传统 `<script>` + `window.WIS`，无 bundler，支持 `file://`。当前 build 以 `core/build-config.js` 为准。

0.1.8.4发布基线已于2026-10-30同步；本次scalar-endpoint修复及旧强反馈求解器退役仅在开发版，尚未同步发布。发布版剥离调速与公式调试，正式速度固定×1。

长期约束见 `../AGENTS.md`，当前项目状态见 `../AGENT_CONTEXT.md`，测试见 `../TESTING.md`。

本轮有界尾项候选使用AmountProducts.compact的认证保守压缩，由Amount.compact/boundedFieldParts在连续余额与统计所有者写入时显式调用：尾项超过24压至≤8，32位小数系数；通用Amount.fieldParts仍精确。G/TREE整数、TREE建设预算、无限点、宝物库存、已付/退款记录及精确时间/计数不压缩。Save75记录策略版本1。实际Config75；已同步主线程与Worker，启用前的591主回归、42引擎、13生命周期为历史记录。真实600帧平均114.35ms尚未通过原整体性能门禁，本次按用户要求先启用，当前预算/边界验收为602数值/阶位、13生命周期和原42引擎入口全部通过；详见budget-engine-boundaries-20261101报告。统计按需汇总未实施；详见本批tail-cap-20261101报告。

## 1. 目录职责

| 目录 | 当前职责 |
| --- | --- |
| `core/` | BigNum 适配、配置、State/Save、资源访问、Runtime/Evaluation、Effects/Sources、积分器、通用账本/概率/重置。仍有少量历史领域桥接。 |
| `power/` | Scale 行动/强化/公式/来源、Googol/softcap 相关逻辑、ScaleKernel。 |
| `cultivation/` | 仙道/修真资源、能力/境界、探寻与天劫、Exploration progress。 |
| `meta/` | Achievement、Challenge、BigNumbers、Treasure inventory/progress/rules/ledger。 |
| `simulation/` | Online/Offline 调度、FixedSegment、ResourceGroups、FixedSources、predictor/executor、ResourceEvolution、checkpoint、compiled micro、time/recovery。 |
| `ui/` | 中央格式化、SourcePreview、BigNumbers/Xiuzhen/Treasure 领域 UI、App 渲染与交互。 |
| `game.js` | Save/load、Runtime bind、模块组装、Simulation/UI context、主循环启动。 |

大文件 `immortal-logic.js`、`scale-logic.js`、`ui/app.js`、`simulation/offline.js` 当前不是自动拆分待办。

## 2. 版本轴

| 名称 | 当前值 | 含义 |
| --- | --- | --- |
| gameVersion | `0.1.8.4` | 玩家可见开发版本 |
| schemaVersion | `75` | Save envelope/State schema |
| buildId | `dev-0.1.8.4-20261102-online-work-reduction-r2` | 开发构建与静态缓存标识 |
| settlementRuleVersion | `2` | 持久化固定结算规则版本 |

Build mode 为 development，调速和公式详情入口开启。

第四步资源 multiverseCoefficient（N²）由cultivation/resources注册，xiuzhen负责库存/支付/速率，ResourceGroups声明N与M反馈依赖。道无涯沿用既有来源指数层，道源通过本源自然奖励倍率统一结算；UI复用中央格式化。长生诀由Martial捕获K、起点气及心支撑，FixedSources保存本段来源，FixedSegment准备在线衰减积分或冻结起点速率，并于同帧自动动作后入账。新能力按原重置/Save规则处理，不改变持久化clock/debt/RNG合同。

高阶多元由meta/high-multiverse.js管理独立meta.highMultiverse，正式资源ID为meta.multiverse.highMultiverseCoefficient。阶数用十进制字符串/BigInt保存；C6及当前体系highMultiverseEligible为资格。体系highMultiverseRate提供压缩后基底，通用模块只执行一次2/k削弱，再应用可选highMultiverseMultiplier（默认1）及sqrt(1+H/10)库存衰减。仙道的六通过该后置倍率生效；N/M平滑获取与能力配套见AGENT_CONTEXT最新节。付费阶位与历史最高永久保留，散功保留当前库存，其他转生清当前库存；顶栏按当前有效资格显示。

## 3. 脚本装配

`index.html` 是唯一人工脚本成员/顺序真源，`js/script-manifest.json` 是生成结果。当前清单84个主脚本，Worker72个成员。AmountProducts/AmountLedger/Amount/AmountFormulas/AmountMigration/AmountConsumers六模块已加入开发装配，其正式行为受模型门禁控制。未来75功能测试通过，真实性能失败，未启用新模型。

大致顺序：

```text
build config / Decimal vendor
→ namespace / BigNum / common math / SignedLedger
→ Rank / RankMath / CertifiedRankMath / RankProjection / RankExact / RankGCost / RankBudget / RankBasis / RankSettlement
→ treasure rules
→ config / registry / integration / runtime / state / save / resources
→ Effects / Sources / power / cultivation registrations
→ meta / exploration / challenges
→ simulation kernels / FixedSources / predictor / executor / ResourceEvolution
→ LegacyStrongFeedback checkpoint reader / CheckpointStrategy / FixedSegment / CompiledPlan / Step / Offline / Loop
→ UI modules / App
→ game.js
```

新增脚本时改 HTML，不手改 manifest；完整工作区用现有 `tools/update-script-manifest.cjs` 生成/检查。

离线专用线程由 `worker-protocol.js`、`worker-client.js`、`offline-worker.js` 协作。`offline-headless.js` 和 `offline-worker-entry.js` 仅在 Worker 内装配生产公式与 Offline/Step；`offline-worker-bundle.js` 是 `tools/build-offline-worker.cjs` 从清单生成的自包含经典脚本，支持 file://，运行时不下载模块。修改运行代码后依次运行 `node tools/update-script-manifest.cjs --write`、`node tools/build-offline-worker.cjs`；以各自 `--check` 验证。主线程保存检查点成功后才安装并 ACK，Worker 必须等 ACK 后继续。

## 4. 正式资源

当前逻辑 ID：

```text
core.joules
core.power
cultivation.immortal.mana
cultivation.immortal.immortalPower
cultivation.immortal.xianForce
cultivation.immortal.yuanForce
cultivation.immortal.nieForce
cultivation.immortal.universeCoefficient
meta.bigNumbers.construction
```

`Core.Resources` 通过 Registry definition 访问，不按字符串短名推断领域。仙道特殊适配在 `cultivation/resources.js`。

xianForce / yuanForce / nieForce / universeCoefficient 是正式领域数量，但公共旧 snapshot 外形保持兼容；residual/tail 不注册成正式 Resource。

## 5. Evaluation / Effects / Sources

`Runtime.withEvaluationState` 提供同步显式 state 求值作用域；Effects/Source 在候选环境读取当前绑定 state。

必须保持：

- 同步，不跨 await；
- candidate 只读/COW；
- 异常恢复 Runtime/Effects；
- 不跨 candidate 共享可变最终缓存；
- Source function/valueAt 同次 collection 一次求值；
- highestPower probe 只用当前 override/依赖合同。

当前 conversionGain 等热点使用 Evaluation/Effects 局部 memo，不使用模块级跨候选最终结果缓存。

## 6. Online 主路径

`simulation/loop.js`：

```text
wall time enqueue
→ pendingContinuousTime
→ drainOnlineSlice
→ advanceGameStep(≤ cadence)
→ 完整 settlement
→ debit pending time
→ request render / optional continuation
```

当前：

- cadence 0.1s；
- 每 slice 最多 8 个完整 step；
- 默认约 12ms soft wall budget；
- budget 只在完整 step 之间检查；
- 一个重 step 不会被中途切断；
- 炼气批购例外地先完成私有精确计算：未完成的 foreground step 整体回滚，时间仍在原队列；唯一 continuation 续算后重试并一次提交原 step，不发布半次购买。手动批购也由同一个 owner 续算；import/reset/state 身份或玩法输入变化使候选失效；
- Qi work 同时使用 3ms 软预算和每片最多 4096 term / 256 block；预算只决定 yield，不参与费用数学。部分 block 仅在候选中，完整纯数学 block 使用最多 8192 项 LRU；候选不进入 Save；
- 尚有 runnable debt 时用单个 `setTimeout(0)` continuation；
- online/offline barrier 按 time ledger 顺序处理。
- recovery 的 Qi 计算复用已有私有 generator，不新增 runner；不跨 yield 保留 Runtime/Evaluation 作用域。

在线恢复的内部桥接终点对齐既有余帧，使用瞬态 queue clock 按正式 Loop 的逐步减法消费；只持久化既有 task clock/gameSeconds。在线先按补偿上限裁剪，再调用正式 Step 的挑战时间判界；自动购买资格在挑战截短前确定，保持普通 Loop 的运算顺序。FixedSegment 准备前台大数私有事务前先物化 COW 域，避免 raw 写入被子副本遮蔽；候选仍在完整步骤后原子提交。

重型玩家动作若连续执行，需要在动作之间 cooperative yield；不要把 0.1s cadence 理解成浏览器并行线程。

## 7. Offline 主路径（rule2）

正式链为 Offline task → prepareFixedWork(frozenOffline) → FixedSegment.createWork → 固定起点来源乘全段时间 → 批量宝物/G/TREE → token/root校验 → 原子install与clock/debt/checkpoint。

只对同速率时间映射与RNG模式的相邻离线队列合并；不能跨在线barrier。每段仅捕获一次来源，新增奖励不反哺本段，不执行任何自动化。完成后单独刷新一次在线速率。快速挑战只观察截止点前的冻结收入，不把超时后收益算入成功资格。

G/TREE的captureFrozen/prepareFrozen用起点进度速率和起点倍率，费用求和与二分有界；TREE离线不升阶、不换阶段，超额superProgress保存至在线消费。保留宝物库存、有限余量、signed tails、pending与precision记录，宝物由原正式批处理发放。

失败保留未结时间，不调用旧微步fallback。整个离线候选成功才提交，Worker重试从相同已确认起点重算；旧恢复缓存迁移丢弃，已提交数据和累计directWork不清零。CheckpointStrategy仍负责budget兼容/诊断accept，lastExecutorKind为frozen-offline；它的plan及下面的旧executor供兼容接口和诊断回归使用，已退出true offline生产选路。

未来新增自动来源必须注册到FixedSources，或提供冻结起点的有界进度适配；新限时挑战要定义截止观察。门禁必须验证常数来源查询、无逐帧fallback、宝物不反哺、Worker/local一致及失败原子性，不能靠提高超时替代。

生产装配清理：offline-strategy.js、discrete-batch.js、projection.js、treasure-events.js不再列入index/manifest或Worker；game.js不再创建两个旧事件/投影实例。源文件保留供诊断加载器显式装配。Runtime.withProjection、FastForward宝物批处理和FixedSegment在线结算仍为正式共享功能。旧数值求解模块中的budget复制、checkpoint校验和capability恢复仍被共用，本轮未拆除这些依赖。

## 8. ResourceEvolution / Predictor（兼容/诊断路径）

`ResourceEvolution` 在私有 candidate/COW 中推进六资源与 progress totals；FixedSources/ResourceGroups 是正式来源和读写入口。

存在：

- weak large-fixed；
- fixed fallback；
- DiscreteMap/predictor；
- Scale/Coupled kernel；
- compiled micro/replay fallback。

这些不是“谁更先进就全局替换谁”的关系；选择受当前 capability/validation 合同约束。

## 9. Exploration

### Exploration progress

`cultivation/exploration-progress.js` 负责天材地宝 progress/requirement/carry/retained settlement。高精度路径已有 lazy/reuse 优化；Online 不得改用 Offline approximate。

### Manual Mana integration

手动探寻 actual/Preview 通过 `ImmortalLogic → ScaleLogic.applyResourceSoftcapDynamicRateOverTime → Core.Integration.createAdaptiveWork`。

当前优化：

1. work-local static source / Effects preparation；
2. exact sample memo；
3. autonomous scalar representational cycle fast-forward。

Cycle fast-forward 只压缩严格相同的 reject/accept 控制二周期，保留：

- 原 tolerance；
- full/half；
- endpoint；
- logical accepted/rejected/evaluation；
- 最终 state / Preview / Save。

不满足严格门禁即走原 adaptive solver。

### Preview lifecycle

- 第一次可见且无 snapshot：高值 DOM 先 render/paint，再在后续 task 计算精确 Preview；
- snapshot + dirty 控制后续刷新；
- hidden/折叠/非当前区域不做无意义工作；
- 手动“刷新预览”按钮已移除，但程序刷新入口仍存在；
- ordinary click 完成 action 后按现有合同同步最终 Preview。

### Hold scheduling

探寻 pointer hold 使用 cooperative 调度：

```text
formal explore commit
→ merged UI render
→ rest timer
→ rAF
→ next host task
→ still holding ? repeat : stop
```

hold 中间不计算 Preview，只保持 dirty；释放/取消后最多一次最终精确 Preview。正式 Online MainLoop 在 repeats 之间继续运行。

## 10. Integration 当前特殊优化

`core/integration.js:createAdaptiveWork` 的 representational-cycle 优化是**严格等价压缩**，不是新精度模型。

关键原则：

- opt-in autonomous/context contract；
- 精确 Decimal/control-state 比较；
- 观察至少两个相同完整周期；
- 批量跳过的只是重复 quadrature；
- remaining 仍按原 Decimal subtraction 语义推进；
- endpoint 留给原 solver；
- diagnostics 区分 actual 与 logical evaluations；
- unknown/vector/invalid context 默认不启用。

不要改成近似 ULP/tolerance 快路。

## 11. 大数显示

中央入口：`ui/format.js`。

当前显示层规则：

```text
1e99999999      -> 1e99999999
1e100000000     -> ee8
1e-99999999     -> 1e-99999999
1e-100000000    -> e-e8
```

更高 layer 使用 `ee/eee/(e^N)` 及对应负向 `e-e/e-ee/...`。

`SourcePreview`、BigNumbers 与其它玩家详情入口已经统一中央 formatter；内部 serialize/toString/Save 不改。

高层资源若 ee+ 库存/rate 格式化字符串相同，可追加 presentation-only 相对速率；该提示使用已有库存和已发布 rate，不新跑公式。

## 12. Treasure / BigNumbers

- `meta/treasure-rules.js` 是 requirement / compatibility chance 参数权威来源；
- `treasure-ledger.js` 负责状态适配和兼容数学 API；
- Treasure `high-geometric-batch` / `high-power-batch` / precision-limited / pending 等保持当前语义；
- BigNumbers 正式进度/里程碑在 `meta/big-numbers.js`；普通 progress 可以批量，但改变规则的事件仍由正式外围结算语义决定。

不要把 Treasure progress 机制解释成真实掉落概率。

## 13. Save / Recovery

存档按 core / powerSystem / cultivation / meta 分域；旧字段访问器保持兼容。

当前：

```text
schemaVersion = 72
settlementRuleVersion = 2
```

Offline recovery 保存 pending task、debt、segment budget、time ledger 等已提交状态。运行时临时 UI/hold/capability presentation 状态不进入 Save，除非现有 recovery 合同明确包含。

导入和无限转生使用 `storageSnapshot({transaction:true})` 的临时 receipt。只有本事务成功写盘后才获得回滚其文本的资格；回滚以已写文本做 CAS，不覆盖其他标签的新内容。未写盘时只恢复当前页状态和 authority，不回写旧磁盘快照。成功/失败均结束 receipt，hold 与 UI 的释放不依赖存储回滚成功；失败保留明确未保存状态。receipt 不进入存档，也不参与后续普通 autosave。

纯显示/缓存/调度重构不要提升 schema。

## 14. UI 状态边界

UI render/view/query 不写正式游戏状态。

当前关键 UI 合同：

- 主资源速率读取正式 step 已发布 `tmp.rates`；
- 高层相对增长提示只读已有 rate/current；
- SourcePreview/公式详情只做展示；
- Exploration Preview 无持久副作用；
- 首次 Preview 不阻塞首个高值 paint；
- long hold 合并中间 Preview/render，但正式 action 每次立即提交。

## 15. 模块身份

### ACTIVE

Core/Power/Cultivation/Meta 正式模块；FastForward；Accuracy；Simulation 当前主链；UI；game bootstrap。

### ACTIVE + REFERENCE/DIAGNOSTIC

- `FixedSources.continuousWork`
- Profiler

### DIAGNOSTIC-ONLY（不进入生产页面/Worker装配）

- `simulation/offline-strategy.js`
- `simulation/discrete-batch.js`
- `simulation/projection.js`
- `simulation/treasure-events.js`

### COMPATIBILITY / LEGACY-PRESENT
- State 旧访问器
- TreasureLedger alias
- Resources 旧 facade
- legacy randomMode/recovery 兼容

以上四个诊断模块已退出生产装配，但仍有显式测试依赖，源码保留。其他共享模块无整文件删除结论。

## 16. 开发/发布边界

当前 ZIP 是 development runtime。默认不修改发布版、不发布、不 commit、不 push。

完整开发工作区若有 manifest 工具：

```text
node tools/update-script-manifest.cjs --check
```

修改脚本成员才需要生成新清单；普通逻辑修改只更新 build/cache 标识时保持成员/顺序不变。


## TREE v1（2026-09-21）

- `meta.bigNumbers.tree` 保存显式构造、手动超构造和完成态；默认止于 TREE(3)，D1-2 允许 TREE(4)+。
- 解锁复用 `Achievements.has(state, "googol")` 与 `BigNumbers.get(state).gIndex >= 64`。
- `meta/big-numbers.js` 集中规则；`meta/big-number-resources.js` 注册唯一新库存 `meta.bigNumbers.construction`，snapshot=false，核心六资源模拟接口保持。
- TREE 构造点来源为 `(gIndex/64)×2^node`；分枝全程 ×1.5/级，标签只在正式阈值后 ×1.6/级，跨阈值 O(1) 分段。G64 跨界只计解锁后的时间，旧 G64 progress 不兑换。
- schema 63；TREE3 永久成就只解锁无限，不恢复当前 TREE。普通 reset 保留 BigNumbers；无限转生及三个大数挑战进入时清空当前 BigNumbers，保留无限资格。
- 行动页增加“大数·树”，内部没有新 tab；构造库存与 sequenceWork 历史分离。
- 本次完整说明和验收见 `../docs/tree-v1-20260921.md`。

- TREE 旧显示修正（已由下述解锁进度 UI 替代）：来源及三个强化的当前倍率常驻显示。schema 仍为62。见 `../docs/tree-refinement-20260921.md`。

- TREE 当前显式 UI 使用中央 k/M 显示整数下标；阈值前显示正式 sequenceIndex/thresholdIndex 解锁进度，阈值后仅显示基础倍率与手动入口。标签升级在正式门槛前锁定；旧等级保留，阈值后生效。正式推进公式未变。详见 `../docs/tree-progress-20260921.md`。

## 无限层 v1（2026-09-22）

- `meta/infinity-config.js`：21节点、前置/互斥、4挑战和首版参数；`meta/infinity.js`：永久状态、购买、收益、候选重置和正式效果。
- `ui/infinity.js`：行动/无限及强化/无限强化；手机2×2分支标签，一次一棵树。
- `game.js` 使用既有导入快照与 scheduler/catch-up 生命周期提交/回滚无限转生；购买发布 meta 根，拒绝旧候选。
- `runElapsed` 为游戏时间。在线/在线恢复保持 ONLINE_EXACT；true offline 保持 OFFLINE_APPROX。快速挑战5秒窗口共用离散执行顺序，来源与时钟账本仍按原来源记账。
- G/TREE 默认上限不变，节点解锁后最小延伸；B5及单体内容不在本版。详见 ../`docs/infinity-v1-report.md`。

## 导入恢复交接（2026-09-22）

prepareSave 成功仅表示一个调用完成；导入使用 captureOnly，再由 Loop.handoffImportRecovery 在事务 hold 与恢复门控内转交有序时间元数据。complete 才是全部区间交接完成的证据；失败走既有 import rollback。保留12ms预算、source/speed/compensation/RNG与原runner。详见 ../docs/import-recovery-handoff-20260922.md。

## TREE 后期规则

G64 后需求与 TREE/D4 规则由 `meta/infinity-config.js` 和 `meta/infinity.js` 权威计算；`meta/big-numbers.js` 使用闭式/对数阶费用求和，无逐阶长循环。TREE 构造与衰减阈值分别计算，D1-2 解锁后升阶自动开始下一阶构造。高阶超构造需求及完成比例保持 BigNum 表示，UI 仅将时间转为估算。旧 G65+ 进度用可选 `gCapacityModel` 标记一次换算。参见 ../docs/tree-late-rules-20260923.md。

## 仙道第三步（0.1.6.5）

天人五衰要求当前碎涅，J/战力量级软上限逐段保留40%原始削弱；当前元力1e20与J/战力各3e68通关。空涅至空劫沿修真道境界及支付账本扩展。涅力和单体宇宙系数分别以 cultivation.immortal.nieForce / cultivation.immortal.universeCoefficient 注册，存储于 xiuzhen.resources；系数不是J/战力换算，也不自动开启更高宇宙层级。来源按帧起点统一采样，ResourceGroups/FixedSegment同时结算；originImprint使用正式宝物进度账本，仅由实际新增涅力驱动。

武道模块：cultivation/martial-config、martial、martial-system 为配置/领域/注册；ui/martial 为原框架子界面；simulation/martial-interval 仅处理武道离线区间。非武道执行器允许休眠武道，活跃武道保留离散路径。兼容说明见 ../docs/martial-sync-20261004.md。

武道离线高值区间（2026-10-05）：martial-interval 对 layer 0/1 使用可表示的 log1p 坐标，不再用 1e300 拒绝；更高层仍由结构签名监测实际变化。只有正式探测确认没有可表示支出时，高值 J/战力才采用归一化收入外推；Y 复用 BigNumbers.prepare 的实际采样相位。其他状态仍需粗细步、累计误差、下游扰动与事件检查；失败缩短或回放。Y 新增收益误差的 origin 随现有 version2 区间检查点保存，旧记录兼容。正式在线路径不使用此模块。

历史planner的30/3秒Worker重试缩段选项已从生产宿主删除。rule2重试继续从确认起点准备完整冻结任务；真实超时、重试上限与ACK机制保持。


天材地宝共用批量规则（2026-10-10）：Core.FiniteProgress提供geometric.cumulative/inverse/unresolvable与batchCount/batchBoundary，供宝物和ExplorationProgress共同调用。天材地宝保留分段需求和等级上限；已保存余量继续使用finite v2，精度受限时留存而非报错阻断在线。旧高精度math只供诊断/旧进度转换使用，不能把SignedLedger.normalize后的第一项当作精确最大项。版本/Schema72/rule2与在线时钟粒度保持。

## D7 在线自动化（2026-10-11）

BigNumbers.automate复用正式购买和进入入口；FixedSegment在安装本帧大数收益后调用一次，避免已准备的大数域覆盖购买结果。仍处于同一私有候选事务，异常整帧回滚。runAchievementAutomations缺省/延迟或offline时不执行D7。顺序为分形→节点/分枝/标签/已解锁的超构造增幅→超构造，单帧最多六个动作，无无限购买循环。core.preferences保存fractalAutomationEnabled、treeUpgradeAutomationEnabled、treeSuperAutomationEnabled和treeSuperAutomationMultiplier，旧档默认true/true/false/2，不提高Schema。

树升级长按复用App.bindHoldButton，managedCommit由原有performSavedAction承担保存/动作完成，避免重复完成调用；可见性和手动购买条件控制重复。未购买D8时超构造点数产出为零，进入倍率始终锁定。

## D8–D10 超构造扩展（2026-10-11）

InfinityConfig配置节点、价格和前置。BigNumbers的产点/购买门槛统一供手动、长按和D7自动化使用：D8开放super阶段点数收入，D9开放升级；sequenceWork不随super产点增长。advanceContinuousTree只在线消费当前目标单位的superProgress，几何费用二分至多53次（未满一阶直接返回），D10完成后保留库存/序列/强化/倍率。captureFrozen冻结D8点数速率；prepareFrozen只累加superProgress、不升阶，normalizeTree允许super阶段进度>1；进度条显示满格，文本显示实际累计量。没有新增存档字段，Schema72/rule2不变。UI将构造点和强化从explicit容器中独立，按D8/D9资格显示，保留共用长按/支付事务。

## D11 动态超构造倍率（2026-10-11）

BigNumbers.treeSuperSources/ treeEffectiveSuperMultiplier供显示、即时速率与自动进入阈值共用；superEntryMultiplier仅保存入场基础，不覆盖动态加成。treeTimeExposure稳定计算1+sqrt(t/600)的积分。advanceBoostedTree先以原始需求消耗已入账进度（防止离线收益重新乘倍率），再以时间积分工作量和1.4/1.2递增费用有界求解在线升阶，0→3单独处理倍率跳跃。未购买D11时保留原推进路径。treeSignature包含第四强化等级和拥有D11-1时的计时。

强化4的第L个已购等级对应下一费用：1000*10^L*1.1^(L*(L-1)/2)，沿用Resources支付与整帧候选回滚；无D11-2不能显示/购买/自动购买。tree.superElapsedSeconds是非负Decimal，upgrades.amplify是非负安全整数，旧档均补0。退出超构造/转生重置时间，D10连续升阶保留；离线prepareFrozen增加时间但沿用captureFrozen的起点倍率。UI预计耗时标明“按当前倍率”，不当作未来加速的精确预测。


### C2 / B6 / C3 接入（2026-10-11）

Infinity.prepareRebirth在完成重置/重洗节点后，通过ImmortalLogic.applyCultivationSelection选择C2设置体系；该函数与手动选择共享资格及奖励，不调用UI/保存。core.preferences.cultivationAutomationTarget为可选枚举，默认关闭。

Infinity.fractalGainMultiplier的order0包含C3的(1+N)^4；BigNumbers在线、来源和captureFrozen一致使用该倍率，冻结样本保留cultivation以读取起点N。

B6由Core.Penalties集中提供阶梯公式和下一档位边界。ScaleLogic动态积分通过googolResource选择对应边界；Core.Integration在边界用左侧速率积分、跨档重新取右侧速率，左极限仅在同步回调作用域内生效并在异常时恢复。普通玩家保持原连续公式与积分路径。

### C4 圆环之理（2026-10-12）

C4接在C3之后，100点。Infinity.prepareRebirth对infinityRing建立仅保留成就、设置和RNG的全新候选，不发点数。meta.infinity.ringChallengeActive独立持久化，让必要的普通/体系挑战与无限转生可在圆环内继续；Challenges在正式结算检查当前realm>=7后发放eternalWitness并结束圆环。Reset按挑战定义的system保留体系挑战次数和bestQiLayer，旧保留全部内容效果停用。退出保存失败恢复活动标志。

有限进度精度修复（2026-10-13）：Core.FiniteProgress 的 create/advance/value/remaining 在投影前用 SignedLedger 严格消去公共项，跨越需求按投影前符号判断，避免大需求吞掉小进度或提前发奖。维持 finite v1 的 requirement/remaining/carry 字段；直接宝物入库更新需求时保留绝对自然进度。SignedLedger 在函数调用时读取，现有脚本加载顺序不变。


## 修真道第五至第九步（2026-10-25）
Xiuzhen维护境界12至16、第五步先天原始率与第六至九步动态能力；Immortal注册项highMultiverseRate转交此原始率，HighMultiverse统一削弱。高阶highest字段以(order,coefficient)比较并由正式credit/promote/registry设置保存，纯highest查询还纳入候选当前库存/peak，消费不降历史；旧档normalize补记录。ResourceGroups补涅力/战力对高阶的依赖及阶数签名。UI按原realm/ability列表自动装配，新先天说明和第五步升阶资格独立加入。费用公式及重置边界见../AGENT_CONTEXT.md与../../WIS-项目资源/xiuzhen-fifth-ninth-20261025/REPORT.md。


## 高阶多元成就（2026-10-25）
HighMultiverse.currentOrder统一当前可见已解锁阶位；Achievements提供三成就及共享阶位倍率。Infinity.previewRebirth在基础+3后乘无限多元；silverSeaRate共享最终预览，不包含退款。FixedSources捕获银海率，FixedSegment在私有候选连续提交阶段调用awardSilverSea，整数记余额/累计，有限小数silverSeaProgress保留；不调用转生或调整时钟。Treasures.getTreasureAwardMultiplier只给originImprint叠厚土×阶数。UI动态更新两成就倍率，并在无限页显示银海速率。详见../../WIS-项目资源/multiverse-achievements-20261025/REPORT.md。

## 武道七项能力（2026-10-25，仅开发版）

开发版本仍 0.1.7.13；build dev-0.1.7.13-20261025-martial-seven。发布版未改，Schema72/rule2/存档key不变。

新增天魔策/慈航剑典各200神魂，要求先天、当前心200；实际消费每1心基础给予10气/体。手动/自动神魂转换与Registry心支付均在全部扣费后按候选库存/心计算，再叠丹劲和基因源能并走原长生诀直接收入积分减速，包含即将收入；前置门槛、set、重置、零额、失败支付不触发。预览只读且复用相同奖励函数。

宇宙流：基因源能9级，神魂费用200×2^(等级−1)，每级获取倍率×2，满级×512，仅首次解锁需气体1000/心120，后续升级只需神魂；作用凝气、锻体投入效率和直接气体收入，随后原减速。水晶冥想600魂、基因源能/心300前置，炼心神魂投入效率×5。秘境流：苦海1000魂/气1e4；命泉2000魂/体1e4/苦海；神桥5000魂/心1000/命泉。三者分别以1+[log10(1+气/体/心)]²乘呼吸法/极限运动/鬼背的原倍率，不凭空解锁原强化。神桥仅在武道且鬼背已购买并激活时取消J×0.75惩罚并增强战力。

沿原能力存档/转生清除规则，无新持久字段。现有宇宙、秘境占位页正式接入卡片与购买升级；行动预览显示消耗心奖励，鬼背与原强化预览同步倍率。Scale Effects声明martialQi/Body/Heart动态依赖。在线保留0.1秒正式结算；离线沿起点冻结长生诀收益，不运行自动兑换。

针对性验证：新增10项Node、原长生诀14项、罡劲丹劲7项、冻结离线13子场景；真实UI 1280/390/320宽度购买/满级/存档/只读/无溢出；4场在线离线Worker与同浏览器本地完整玩法、debt、RNG、Save一致（仅排除宿主时间戳）。85运行JS语法、79脚本manifest、68脚本Worker检查，发布91文件哈希未变。没有全历史套件、实体设备或长期性能验收。详细数值及文件见 ../WIS-项目资源/martial-seven-20261025/REPORT.md。


## 0.1.8.1：永久高阶多元阶位与最高记录（2026-10-25）

本次修改高阶多元的重置合同：付费order/owner与按阶数优先比较的highest永久保留；除散功原样保留库存外，重修、挑战、无限转生、无限洗点、圆环入场只清amount/total/peak。原升阶消费不退款；洗点仍只退无限强化实际付款，C6洗掉后需重购并满足第五步前置。第五步恢复后在保留阶位直接产出，无重复激活费用；系数门槛与下一阶费用延续原阶数。不会把保留阶位提前当作本轮已达到的有效N阶位，顶栏/无限点倍率等仍依当前体系可见条件。

无限界面在体系未恢复时也显示已保留阶位、当前0库存、跨转生历史最高数量；与其他体系切换不丢失。第七步在本轮再次购买后读取永久最高记录，文案同步更新。新历史行继承大阶数换行规则。现有存档字段足够，Schema72/rule2不变；旧存档可从其仍保留的order/peak补最高，已被旧版清除的记录不伪造还原。下文旧“无限转生清阶位/本轮最高”描述被本节替代。

开发build dev-0.1.8.1-20261025，发布目标release-0.1.8.1-20261025；用户明确要求本次同步发布并取消调试。新保留合同5项Node先失败后通过，与原高阶10/修真7/三成就8共30项通过。真实UI1280/390/320宽度覆盖实际点击转生、零库存、记录显示、重载、第五步恢复和80位阶数字符串；四场真实Worker覆盖在线/离线以及尚未恢复/已经恢复来源，与同浏览器本地完整玩法、RNG、debt、Save一致。详见../WIS-项目资源/release-0181-20261025/VERIFICATION.json。


本次已完成发布同步：release-0.1.8.1-20261025。发布代码38项Node、保留进度UI三宽度、Worker四场、发布四宽度无调试/只读/Alt+S无效、两份旧档和file启动全部通过；开发圆环保护另9项通过。独立审查复跑30项通过，无阻塞或延后问题。仅本地发布，无commit/push/线上部署。

## 2026-10-28：描述与体系资格接口

`cultivation/xiuzhen.js` 保留原指数入口，通过内部uncappedExponent取消三项硬上限，旧阈值之后使用连续对数增长；不改变regionExponent的组合方式。`ui/xiuzhen.js`仅把既有踏天/第五步来源表现为自动能力卡，无新增购买或持久字段。

高阶多元Provider由`cultivation/immortal.js`注册：`highMultiverseEligible(state)`表示当前可升阶/产出，`highMultiverseVisible(state)`表示已有高阶库存可见，`highMultiverseInitialCoefficient(state)`返回首次N²系数。未来体系需要注册这些只读函数及已有`highMultiverseRate(state)`；未提供资格的体系默认不可用。当前阶位owner仍按永久保留合同约束，切换体系不转移库存。公共HighMultiverse仅统一门槛/支付/取根及2/k削弱，UI使用“当前体系高阶多元资格”。N/N²的仙道资源展示仍沿用已有规则。

## 2026-10-29：符号阶位大数边界

G与TREE阶位经BigNumbers.rankValue/ rankAdd/ rankCompare处理，普通安全整数保持Number兼容，超大精确整数使用可被BigNum读取的科学计数串，更高e/ee使用Decimal；maximumG/maximumTree在D1已解锁时返回null表示无玩法封顶。不得以Number/Math或字符串拼接处理大阶位。UI统一使用Format，整数计数不使用显示舍入结果。Schema73保护新阶位格式，普通资源及rule2时间/RNG合同保持。

## 2026-10-29：宇宙产出与衰减来源边界

Xiuzhen.rawRates保留技能合并后的原始N/M率，rates最终应用10/秒以上的连续对数压缩及1000库存以上的平方根衰减；高阶Provider压缩体系原始率后，HighMultiverse.rate只执行一次2/k削弱和10系数以上的库存衰减。库存查询只读，M输出自依赖不可省略。离线冻结最终起点速率的合同保持。

启动保护为 index.html 的独立 ES5 内联段；不计入外部脚本 manifest。UI.Dialog 在 App 前装配，不进入 Worker。game 分阶段启动，临时会话策略由 Save.sessionPolicy 派生；动作与保存需通过初始校正/恢复注册门控。


2026-10-30：吐纳预览与开发版公式详情在私有候选中分片；正式吐纳按钮通过Loop deferred owner使用createBreathingActionWork，和探寻共享候选提交协议。自主标量固定候选可检测相同完整检查点且时间不前进的precision-stalled，异常桥接禁止半积分提交。普通领域同步breathe保留测试/兼容。玩家极端档会明确提示无法完成此次数值计算而不扣资源，正常公式/精度不变。本次0.1.8.4已同步正式吐纳和预览修复至发布目录；公式详情调试仍仅开发版可用。

2026-10-30开发追加：常数raw+Googol仅由已审计手动factory授证，Integration正primitive终点认证与Scale确定操作检查点保持旧完成结果、私有分片及原子提交；源分项复用同一factory。local只接已审计休眠高阶，unknown provider拒绝；strong旧求解器已退役，历史解析由独立LegacyStrongFeedback reader保留。数学proof和回归见最新AGENT_CONTEXT/TESTING。发布未同步。

### 旧强反馈存档兼容（2026-10-30）

`simulation/strong-feedback-checkpoint.js`只提供`LegacyStrongFeedback.validateCheckpoint`，保留历史bounds/observables及原始数字字符串的严格校验，仅依赖BigNum。CheckpointStrategy保留历史预算字段与标签，生产冻结结算后沿原规则清游标；不生成或运行旧证书。ResourceEvolution显式拒绝旧executorKind。旧StrongFeedbackKernel实现、namespace、planner及Worker装配均已移除；Online/Offline现行数学和恢复债务合同保持。

未来tools/sync-release.cjs在转换及生成物验证成功后定向清理发布目录的旧strong-feedback-kernel.js普通文件；不清理未知文件。当前开发任务未同步发布。

当前加载与提交阶段（2026-11-01）：State.createLoadNormalizationScope/normalizationTask仅服务Save.prepareWork私有会话，sync API drain同一generator。会话封存输入/默认值，Decimal精确复制，恢复时检查model/schema/mathPolicy；不跨host保留全局scope，不从JSON承认内部句柄。75启用此路径，74测试仍保留旧兼容入口。Scale/Immortal的commit…Parts提供按原顺序的私有回调阶段，同步commit drain它们；Step整段成功才安装并消费clock。Amount.compact仅在既有数值owner内复用已完成的完整输入结果。可见版本/schema/规则/尾项策略未变，发布目录未同步。性能最新仍未准入，见本批REPORT/VERIFICATION。


## 2026-11-08：在线私有候选 Worker

`online-candidate-worker.js`是单请求适配器；主线程仍负责动作、账本、保存及正式安装。`online-candidate-worker-entry.js`仅复用headless准备/导出，不安装、不写存档。`Step.createOnlineCandidateReceiver`持有主线程输入守卫并重建一次性token；数据验证与独立Decimal所有权不能省略。`Loop`的waiting/onReady只调度正常续算，绝不在消息回调扣债。动作/生命周期取消及基础设施本地后备均保留未结算时间，数值失败不静默清债。

页面先加载offline-worker-bundle，再加载online-candidate-worker-bundle和client。在线生成物仅存入口和已加载离线引擎的切片引用，生成的Blob仍是独立经典脚本，支持file://。修改引擎后顺序运行：

```powershell
node tools/update-script-manifest.cjs --write
node tools/build-offline-worker.cjs
node tools/build-online-candidate-worker.cjs
```

三个工具均支持`--check`。`sync-release.cjs`已补目标build下双bundle生成（仅在E盘隔离输出回归，当前未同步发布目录）。构建95/78/78，build `dev-0.2.0.3-20261108-online-candidate-r1`。高库存manual准备完成后保存candidate+completion，提交不能重新执行perform积分。准确测试及性能限制见AGENT_CONTEXT和本轮REPORT。
