## 2026-11-11 0.2.1.4 发布版本

开发build dev-0.2.1.4-20261111-release-r1；网页release-0.2.1.4-20261111；APK release-0.2.1.4-apk-20261111，versionCode20104。纳入锻炼反算比较优化、固定准备阶段复用、正常在线预览生命周期与吐纳预览分段续算修复。schema76/model2/rule4、收益规则和原APK签名保持。前轮真实file测试：普通CPU锻炼约5秒/吐纳约1.8秒；4倍降速锻炼仍约23～28秒，非低端数秒保证。发布验收与Git资产记录见 ../WIS-项目资源/release-0214-20261111/REPORT.md；以下未发布说明为历史记录。

## 2026-11-11 正常在线预览生命周期修复（仅开发版）

build dev-0.2.1.3-20261111-preview-lifecycle-r1；可见0.2.1.3、schema76/model2/rule4保持。上一轮冻结主循环的点击性能测试漏验正常在线预览。真实页面15秒55次取消，本轮用非持久owner区分普通在线截断与新会话/动作/挑战结束，清积压不再取消活跃任务，首次预览可在积压中推进。吐纳/探寻只读快照保留Mana分段checkpoint，训练冻结来源与区域前缀保留，武道最终修正也为可挂起阶段。预览3ms软预算+最少32/最多256操作，不能表述为3ms硬上限。

file://原档与截图三项数值模拟，正常在线主循环：锻炼4.84/4.99s、吐纳1.81/1.79s显示收益与下一档费用；4倍降速两轮训练约23～28s，仍非低性能数秒保证。正式按钮实点通过，专项38/38；扩展112项109通过/2失败/1缺档skip，失败为旧错误码断言（HEAD原实现复现）与缺历史真实档。独立审查最终无阻塞，manifest/两个Worker已重建校验。未改离线规则/存档；未发布/APK/commit/push。详情 ../WIS-项目资源/preview-live-20261111/REPORT.md。

## 2026-11-11 比较专用区间优化（仅开发版）

build dev-0.2.1.3-20261111-inverse-comparison-r1；可见版本0.2.1.3、schema76/model2/rule4不变。保留上一轮准备参数优化，AmountFormulas新增单反算私有的凹幂候选区间；认证锚点+有严格余项界的局部展开，枚举至多4个原scalar舍入结果，原插值/完整目标比较全同向才快判。支持单词无尾1<=x<=1e14、1e-7<=e<=1；其他输入回原式。指数严格跟原式先钳制Decimal。搜索/分段/收益/离线合同不变。

最新真实档2046次搜索保持，完整正向探测2046→0，认证锚点67次；内部步骤166841→24291。两真实档完整domain、新旧、保存往返及实际Worker一致。Edge390px两轮新旧交替：正常1264→669/975→507ms（47～48%）；4倍降速20464→12847/12303→7140ms（37～42%）。非手机真机；仍可能长等待，不宣称彻底根治。

同类检查：三缺重置奖励共享优化并已全domain对照；武道与宝物已有Newton/边界修正，吐纳探寻生产linearBudget不进48次反算，探寻普通成本64次为非认证轻量公式，高值已有专用解，未无证据套用。24/24专项；扩展234项228pass/5fail/1缺档skip，5个amount-consumers旧宝物/仙晶尾项断言用HEAD原实现复跑同样失败，未新增回归。独立生产审查无阻塞；测试初态修正后专项通过。manifest/两个Worker已重建并校验，发布版/APK/commit/push未动。详情../WIS-项目资源/training-latency-20261111/COMPARISON-REPORT.md。

## 2026-11-11 后续真实存档锻炼耗时优化（仅开发版）

build dev-0.2.1.3-20261111-training-preparation-r1；可见版本0.2.1.3、schema76/model2/rule4保持。11月11日01:17原档可完成，属于真实反算成本偏高，并非上轮二分续算重新开始。反算分离上界指数准备，在单个候选任务内复用固定库存指数；gain>=1且e>=1e-7时严格排除极小对数分支，直接调用原认证公式。未降低精度、丢弃尾项或改变收益。

两份真实档与HEAD原实现完整domain逐字段相同，最新档锻炼后power1533287349.2910054、J0，保存刷新一致。Node最新档约1733→1321ms，旧档811→620ms。390px触屏浏览器单次普通CPU1090→1221ms（无改善），4倍降速19464→11562ms；不是手机真机成绩，仍有较长等待，不宣称根治。

最终194项193通过/0失败/1外部历史档缺失跳过；专项13项含两份真实档、精度尾项、任务隔离和事务回滚。修复测试probe插桩旧签名失配，并要求计数>0避免空通过。独立审查生产无阻塞，6组非对称软上限新旧完整Amount相同。两个Worker已重建；发布版/APK/commit/push未动。详情../WIS-项目资源/training-latency-20261111/REPORT.md。

## 2026-11-11 0.2.1.3 发布版本

开发build dev-0.2.1.3-20261111-release-r1；网页release-0.2.1.3-20261111；APK release-0.2.1.3-apk-20261111，versionCode20103。纳入无限软上限反算续算修复，保持原收益、schema76/model2/rule4与兼容签名。前轮原档和9项专项验收见下文；本轮发布验证记录位于WIS-项目资源/release-0213-20261111/REPORT.md。下文未发布说明为历史记录。

## 2026-11-11 无限软上限反算续算修复（仅开发版）

build dev-0.2.1.2-20261111-inverse-continuation-r1，可见版本0.2.1.2、schema76/model2/rule4不变。scale-logic.infinitySoftcapInverse 的 Amount 分支改为候选内完整输入绑定的 CertifiedRankMath.task，保留二分上下界/当前探针；80次上限、原算术顺序和返回上界不变。同步调用仍同式计算，取消/变更/失败沿用原事务。

原11月10日22:50圆环存档锻炼小片由15秒未结束变为Node约0.81秒完成，战力仍584957794.7584203；浏览器390px实际点击正常CPU583ms、4倍降速7638ms（单次桌面模拟，非手机保证），保存刷新全domain一致。9/9专项通过；扩展185项183通过/1外部缺档跳过/1旧heavenly-softcap测试脚本失败，该脚本缺MartialAmount.capturePassive，使用HEAD反算复跑同样失败。真实档未修改。

同类审计：共享软上限反算的分段结算调用一并受益；武道求根/闭式宝物批量/Amount公式精度循环已有续算；当前吐纳与探寻只走linearBudget，不走48次非线性分支；探寻64次估算、炼气门槛查找不调用可挂起公式。未发现第二个已证实生产重算缺陷，未改变这些算法。两个Worker已重建，独立审查无阻塞。发布版、APK、Git提交/推送未更新。证据：../WIS-项目资源/inverse-continuation-20261111/REPORT.md。

## 2026-11-10 0.2.1.2 发布版本

开发dev-0.2.1.2-20261110-release-r1；网页release-0.2.1.2-20261110；APK release-0.2.1.2-apk-20261110，versionName0.2.1.2/versionCode20102。schema76/model2/rule4、原兼容签名、收益规则保持。

纳入炼气玩家公式边界修复、幂差区间收敛和小比例巨大指数后备，以及7项旧测试合同修正。最终297项295通过/0失败/2外部历史存档缺失跳过；发布四尺寸/file启动通过；真实炼气81519.567秒离线、另一原档1小时宝物与TREE10→13、保存刷新通过。APK108个www文件逐字节一致，签名/16KB对齐及无调试核验通过。

仍有极端exp容量与接近1的起点尾项边界；无手机/Harmony真机覆盖升级或热降频验收。最终提交、资产摘要与线上验证见WIS-项目资源/release-0212-20261110/REPORT.md。以下是历史记录。
## 2026-11-10 旧回归合同修正（仅测试）

原7失败已按当前合同修正：完整提交测试使用schema75/76，74退役计划拒绝仍保留；历史rank快照只新增196个缺失默认字段，原数值不变；TREE新增仓库合成存档（74旧内核/76闭式），旧路径income一次，当前路径验证单次4032收益入账、同步结果和存读一致；宝物改为当前closed-batch funding/acc、正常200门槛、巨大库存相对1e-12合同及第二笔补偿保存检查。

最终相关129/129无失败/跳过；Edge390px保存刷新meta/资源/RNG相同，普通2000门槛发奖及1e-7补偿余额保留。独立审查通过。生产代码/build未改，不实施全局1e-6清零。无发布版/APK/commit/push。详情WIS-项目资源/test-contract-refresh-20261110/REPORT.md。下文7失败是修正前历史记录。
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

## 2026-11-08 发布 0.2.0.4

用户本轮授权同步开发、网页发布版及APK并上传Git。当前开发build为dev-0.2.0.4-20261108-release-r1，网页release-0.2.0.4-20261108，APK目标release-0.2.0.4-apk-20261108，Android versionName0.2.0.4/versionCode20008。schema75/model2/rule3不变，正式版本关闭调试。

纳入吐纳/探寻候选一次性提交及在线私有候选Worker；保留原数值、RNG、0.1秒cadence、取消与债务保存，不启用自动丢时间。必要Node回归116项114通过/2外部原件缺失跳过；最终发布资源四尺寸、旧档往返、真实Worker100步全状态、file启动/吐纳/取消/保存重载通过。没有全量、手机性能/发热降频或真机覆盖安装验收，不能宣称积压根治。构建与发布进度见本次报告，旧章节的未发布结论为历史记录。

## 2026-11-08 在线候选 Worker 与高库存手动动作（已接入开发版）

当前开发 build `dev-0.2.0.3-20261108-online-candidate-r1`；主脚本95，离线/在线 Worker各78。可见版本0.2.0.3、schema75/model2/rule3保持，未同步发布版/APK，未commit/push。

在线采用主线程权威 + 单步私有候选 Worker：Step导出准备记录，接收端绑定完整派发输入并保留当前对象/字段守卫，经正式token安装；Loop waiting不忙轮询，结果通知只排正常续算，按实际processedSeconds一次扣债。动作、导入、离开取消旧候选，迟到/重复包不可安装。Worker仍使用原12ms软预算与ONLINE_EXACT；基础设施故障退役Worker后转本地精确续算，数值错误保留错误和债务。接收端避免重复整包codec，仍完整验证和独立复制可变Decimal/metadata。未启用丢时间/丢收益政策，也未绕过Worker内部完整输入守卫。

高库存吐纳/探寻保留已准备candidate及completion，提交独立COW中只做后处理，不再重算收益；最新ledger/preferences、transient与失败回滚保持。低库存上轮cooperative路径保留。截图product digit capacity故障未复现，不能声称已修复该具体报错。

定向Node回归110项通过；原生Edge Worker真实最新存档100步逐步完整domain/result/tick/rates/transient严格等价。file://实际Blob收包/正式安装、deferred吐纳、离开取消并保留债务、实际保存字节重载全字段一致通过。另有HTTP页面最终A/B诊断；无合格CPU预检/A-A/真机，CPU4未证明Worker同等降速，因此没有正式性能通过结论。Worker移走主线程计算但增加传输成本，不保证持续吞吐，也不能称手机在线积压根治。数值/RNG/clock/debt/Save合同保持。

详见 `../WIS-项目资源/online-candidate-worker-20261108/REPORT.md` 与精简证据。历史缺档/旧夹具失败未改判，不代表全量测试通过。下文“Worker未接入”为此前记录。

## 2026-11-08 在线吞吐实施验收：工具落地，两个候选撤回

保留上轮 dev-0.2.0.3-20261108-manual-work-r1；本轮无生产玩法/数值修改，发布版/APK/commit/push未动。吐纳低库存修复仍在；高库存长任务、截图容量报错和手机在线积压不能称已解决。

本轮新增 tests/helpers/online-throughput-metrics.cjs 与 tests/online-throughput-metrics.test.cjs：5/30/60秒实际提交窗口、饱和能力与恢复、顶层host、登记/提交/债务守恒、生命周期与独立容量身份；缺证据只诊断，清债/停钟不得假通过。正常批次采钟通过 registeredThroughAt / clockEvidence 证明，账本容差固定1e-7秒。新26项加既有测量24项共50/50通过。

resourceMagnitudeAt输入保留及Sources.collect分阶段续算均已实现、对照后撤回。后者8步描述符重复读取284→60，但数学工作量未减；40步A/A/B/B/A逐步全状态一致，耗时不稳定。真实Edge390页面CPU1→4→1诊断，CPU4提交µ约0.180→0.193，15秒仍积压约12秒，恢复常速约8.3秒才回到0.1秒cadence内；宿主仍超标。CPU预检均值15.68%、p95 24.45%不合格，不能作为稳定性能通过。所有候选与测试在E盘资源归档，当前生产Sources/Scale/AmountFormulas已恢复本轮前字节。

报告、原始采样摘要、可复跑候选、Worker具体接入评估见 ../WIS-项目资源/online-throughput-20261108/REPORT.md。Worker未接入，不得描述为吞吐已根治。manifest93与Worker78检查通过，bundle SHA前缀3068acaafcea8968。

以下为历史记录。

## 2026-11-08 手动动作响应性：部分修复，在线积压仍未解决

开发build dev-0.2.0.3-20261108-manual-work-r1；版本0.2.0.3、schema75/model2/rule3，主93/Worker78不变，未发布/更新APK/commit/push。

低于Googol法力库存的吐纳/探寻采用私有分段检查点、完整数学分片、段内冻结Effects以及一次性后处理提交。段入库和探寻付款后失效Effects；每宿主完整逐字段守卫保留原账本/设置排除，陌生形状回退序列化；提交独立COW、失败回滚。高值统一包装曾严重退化，已撤回，保留原积分路径，仍有同步前置长任务；容量报错未复现。

相关53项47通过/6旧失败（5缺原件、1旧错误码断言，原版均复现）；新增15项通过，最新档动作全字段SHA相同。浏览器常速合成吐纳约280–318→140–145ms，宿主最大240→7.7ms；CPU4宿主最大约2.1秒→33ms，但总完成及p99仍有未通过项。均为诊断，未完成干净环境准入或真机验证，不能称积压根治。最终恢复/Worker结果及旧浏览器实时阶段限制见 ../WIS-项目资源/breathing-backlog-20261108/FINAL-REPORT.md。

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

## 稳定性回归执行要求（长期）

- 性能仍使用用户最新实际档；schema72仅作为数值回归。真实问题档逐份在tests/stability-corpus.json标注来源、SHA和派生选择字段。不存在的原档明确报缺失，不自动替换。
- node --test tests/stability-real-save.test.cjs：全部字段比较，不忽略尾项、统计或history。当前model2/rule3档先恢复prepared.offlineRecovery，再通过正式Loop.handoffImportRecovery移交timeLedger.pendingContinuousTime；固定Date.now为原水位，不加入导出至今时间。当前规则债务必须处理，不能仅以idle/无异常当作清空。旧schema/model1档按本页最新授权在完整加载边界弃债，单独记录弃债，禁止把原文件队列回填到prepared.offlineRecovery。每份在线100步，不满足购买条件记N/A。
- node --test tests/stability-boundaries.test.cjs tests/statistics-reload-invariant.test.cjs：容量2048/2049/2320/4096/8192及拒绝边界、中点两侧、嵌套代理/回滚、积压预览、压缩统计及晚期失败候选隔离。
- node tests/stability-action-chain-browser.test.cjs：真实DOM按钮；读取点击真实storage文本，不用新建envelope替代保存路径；只按persistLive合同预期lastUpdateAt=保存时刻，所有字段逐个比较；内部Save.diagnose、pageerror必须为空，hook以主动诊断正对照验证。
- node --test tests/stability-native-worker.test.cjs：使用已生成bundle在真实Edge Worker执行最新档原队列和100步，以及超容量schema61旧档加载和100步，严格全字段往返。仅Node headless通过不能宣称Worker通过。
- WIS_PLAYWRIGHT指向E盘既有Playwright；WIS_STABILITY_RESULTS/TEMP/TMP设E盘证据目录。所有新夹具和输出只放E盘。
- 历史失败必须给出原断言、实际影响、分类、处理及重跑结果；测试装配缺模块、缺输入、旧合同和真实故障分别列出，未完成者保持失败。当前数值阈值及精确内核断言不得以更新测试为名放宽。

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

Save75/model2/rule3、RNG/clock/debt合同不变，不清空债务、不改原档、不同步发布版/APK、不commit/push。未做页面/真机/性能准入或全量回归。证据：../WIS-项目资源/save-formula-blocker-20261107/REPORT.md。

以下为历史记录。
## 2026-11-07 开发版修复：圆环累计时间与锻炼首次预览

开发 build `dev-0.2.0.1-20261107-ring-preview-fix-r1`，可见版本仍为 0.2.0.1；保留上一轮 D12。圆环之理专用 fresh 分支现在显式保留 totalElapsedSeconds；当前转生计时及其它重置范围保持原规则。已被旧版本清除的时间不能从当前存档推算恢复。

自动首次来源预览仍在积压时避让；锻炼无缓存时，完整 J 达到原 10J 门槛即可点击“计算并锻炼”，走已有可续算正式动作，在证明最终收益后才扣款。已知不足1的预览仍禁用；未完成预览不再成为显式动作的死锁条件。正式收益不使用展示缓存。

测试：新增累计时间3项通过（已见RED）；真实浏览器无首预览+0.2秒积压可锻炼，挑战最终收益不足1时完整状态不变（已见RED）。既有10J完整尾项/积压边界浏览器通过。10文件定向回归79项76通过、3项旧圆环rank-basis-invalid失败，移除本次时间修复后同样复现，未改断言。manifest93/Worker78检查通过。数值、RNG、clock/debt、Save75/2/3不变。

武道战神图录/神国的玩家“更新失败”仍需精确错误或报错存档定位；合成夹具成功不等于排除玩家错误。证据与范围见 `../WIS-项目资源/ring-martial-bugs-20261107/REPORT.md`。本轮不修改发布版/APK，不commit/push；未做全量、真机或性能准入。

以下为历史记录。
## 2026-11-07 开发版D12：超超分形已接入

可见版本0.2.0.1；开发build dev-0.2.0.1-20261107-infinity-d12-r1。D12费用500无限点，前置D11-1/2/3；G额外速度倍率为1+Σc_i·log10(1+x_i)，x_i=Y、Y↑Y、Y↑↑Y、Y↑↑↑Y，c=[0.0001,0.001,0.01,0.1]。四箭头原加成/时间积分不变。通过Infinity.gSpeedMultiplier同源接入正式在线、冻结离线与UI；完整Amount读取用稳定公式，未持有时直接返回1。在线取每步起点库存；离线整个来源锁定起点。费用、里程碑和G/TREE上限、RNG、0.1秒、clock/debt及Save75/2/3不变，无新存档字段。

历史“D12未实施/待比例”记录已被本节取代。节点与付款走现有purchaseLedger/重置退款。两份成熟存档倍率约1.736和1.838；最新G=0存档不提前开G。必要验证64/64，DOM320/390/1280通过；三档未持有D12时前后各10个大数域步骤完整状态SHA一致（非全engine性能门禁）。测试：tests/infinity-d12.test.cjs、tests/infinity-d12-browser.test.cjs。报告 ../WIS-项目资源/infinity-d12-20261107/REPORT.md。

本轮仅开发版已实施，发布版/APK尚未同步，未commit/push。发布同步请求被自动审批拒绝，需用户明确确认发布范围后再执行。未进行真机、全量或性能准入。

以下为历史记录。

## 2026-11-07 发布同步：0.2.0.1

用户授权开发版、网页发布版与 APK 同步并上传 Git。开发 build dev-0.2.0.1-20261107-release-r1；网页 release-0.2.0.1-20261107；APK release-0.2.0.1-apk-20261107，versionCode 20005（高于已发布 20004），沿用旧测试签名，release 构建关闭 Android/WebView 与游戏调试。

本次只升级显示版本与发布装配，Schema75 / numericModel2 / settlementRule3 不变，包含此前积压阻塞修复与预览异步化。既有严格 Save 往返差异仍未修复，历史失败不计为通过。本轮执行版本、发布转换、原生分支和下载入口验证，不重跑全量数值或性能准入，不宣称手机性能已达标。完整记录见 ../WIS-项目资源/release-0201-20261107/REPORT.md。

以下为历史记录。

## 2026-11-07 草稿提交与长系数阻塞回归

- tests/amount-long-ledger-compare.test.cjs：普通长系数精确拆行BigInt oracle；最新实际存档完整恢复320.316秒，再在线6000步，每次提交assertNoDraftProxies。保留末尾严格Save往返断言；当前该附加断言为已确认基线差异，因此整条测试不能标为通过。恢复本身和6000步已经完成，详FINAL-RECOVERY.tap / RECOVERY-SUMMARY.json。
- tests/draft-nested-commit.test.cjs：嵌套/三层草稿、未读及未改写浅拷贝分支、根替换后的后续写入隔离、replay reset、Sheng/prepare、自动突破与失败事务交错。
- tests/draft-proxy-audit.cjs：仅测试源码transform，在所有createDraft代理创建时记录模块WeakSet；候选结束、在线安装、离线安装及直接提交时深扫四个正式根。不得把这些诊断hook加入生产。
- tests/backlog-blockers-worker.test.cjs：真实Edge Worker加载生成bundle，完整恢复并额外20步；代理扫描/时间队列通过，严格Save往返未通过（保持原断言）。运行设置WIS_PLAYWRIGHT为既有E盘Playwright依赖，WIS_BLOCKERS_RESULTS为E盘证据目录。
- 最终原子性定向43/43；116文件宽/相关回归747/817，70个旧失败在before覆盖层同批复现，不计入通过。原55文件名单未改变；完整列表见BASELINE-FAILURES.md。
- latest实际存档SHA7e081143716dc827e6e593644684318d8aa697ffc82fb866d8fd5b9df997190a；正常比较使用schema72原档与2026-11-06T04-46-11-356Z各600步完整SHA。只执行功能与一致性验证，不是性能准入。

证据：../WIS-项目资源/backlog-blockers-fix-20261107/REPORT.md。本轮未修改既有断言、输入守卫、Save/恢复格式或性能门槛。

## 2026-11-06 通用来源预览续算验证

- source-preview-cooperative：渲染不求值、真实宿主分离、状态/结构/页面/子页面/折叠/导入/hidden取消、一个元素一个work、长按/积压、失效退避。
- source-preview-records：新档与最新实际存档，对同步query和可续算query的records/文本/title逐字比较，并比较完整持久状态。
- source-preview-browser：真实DOM Paint先于普通来源数学；渲染作用域query计数为0，持久状态不变。WIS_PLAYWRIGHT指定已有E盘依赖，WIS_PREVIEW_EVIDENCE指定E盘输出。
- 既有 preview-backlog、exploration first-paint/hold/cooperative/refresh、training、amount-source、online scheduler、导入/离开相关测试按REPORT执行。内部调度器改名更新夹具，不放宽业务断言。7项旧失败有before复现，不算通过。
- 本轮S2–S5各180游戏秒A/A→A/B（完整路由至少一轮），不替代长期600秒/手机测试。环境mean≤10%/p95≤15%、同起点A/A≤5%仍保持；CPU不合格只作诊断，A/A失败不继续该场景A/B。host为顶层parent=null；advance、longtask、点击、pending原口径不变。性能最新实际存档原则继续有效。

证据 ../WIS-项目资源/preview-async-20261106/REPORT.md，剩余渲染候选 RENDER-SYNC-AUDIT.md。

## 2026-11-06 性能存档与真实交互场景（用户确认，长期生效）

- 性能判断和性能门禁一律使用用户提供的最新实际存档，记录文件名、SHA256、导出时间、构建和设备环境。用户提供更新存档后改用更新存档。schema72 原档仅用于数值回归，不再作为性能依据；为审查旧测试覆盖盲区所做的对照必须标明“历史测试覆盖对照”，不能据此宣称当前玩家体验合格。
- 现有 tests/amount-runtime-performance-browser.test.cjs 仍硬编码 schema72 原档；未通过覆盖层或后续经授权的入口改造换成最新实际存档时，其结果不具备当前玩家性能准入资格。本轮只读诊断没有修改该测试实现。
- 测试结论与用户实际观察不一致时，以实际观察为准，查找测试遗漏的设备、前后台/焦点、交互、预览、存档量级和主机负载条件；桌面未复现不能否定手机浏览器中已经观察到的积压。
- 正式性能场景必须包含 S1 空跑、S2 主要页面及预览子页面切换、S3 探寻/吐纳/锻炼长按、S4 切页/购买/长按/对话框混合；各场景分别报告，不以空跑均值替代组合场景结论。S5 可见未聚焦、S6 保留研究计算负载作为补充诊断。
- 保留实际存档原有在线债务。仅同量平移 lastUpdateAt、boundaryAt、registeredUntil 以排除导出至今的额外离线时间；不修改余额、RNG、债务、cadence，不冻结后续真实时钟。报告时间处理与启动恢复实际新增时间。
- 另设自然清债后计量的对照：先让正式加载/恢复路径完全处理旧债，再开始计量，不把旧债从存档中删掉。在线队列与恢复队列须同时记录；启动恢复接管在线债务时，online pending 为 0 不等于债务已清完。 自然清债会推进资源与阶位，不能替代玩家直接放弃后的起点；须记录恢复前后 phase/阶位，实际观察涉及放弃操作时单独核对。
- 每秒记录采样实际间隔、pending、新增/处理游戏与时钟时间、完整步生命周期、顶层宿主与全页 longtask、在线/预览/渲染/显式动作/其它占用。嵌套耗时不得重复相加，墙钟耗时不能称为 OS 纯 CPU。只在出现持续新增积压的场景开启 1ms CPU 采样，并单列采样窗口的开销影响。
- 上述原则不放宽已有均值、pending、宿主响应性、单次 advance、长任务与点击门槛，也不替代同窗口 A/A + A/B 和环境资格。实际负载诊断不暂停或终止用户计算进程，环境不合格的结果仅作诊断。

本次诊断证据目录：WIS-项目资源/real-save-backlog-20261106/。使用 2026-11-06T04-46-11-356Z 实际存档，SHA256 323a2bce7d5c523764a52369fb9a3af3bcf6219b0fbb615f5e8f94263ba7efb9；最终覆盖范围以 REAL-SAVE-BACKLOG.md 为准。
## 2026-11-06 在线宿主任务响应性合同（用户确认，当前生效）

- 宿主任务取workMeasurement.hosts中parent===null且完整落在计量窗口内的顶层在线回调（onlineCallback/runMainTick等），包含drain、advance、install、同任务发布/通知/渲染。嵌套drain不单独计数、不重复相加。门禁host p99≤16ms，max≤50ms。
- 单次advance最大值仍须≤50ms；advance p99保留记录，替代原先p99≤16ms的单独门禁。报告并列新旧口径，说明变更由用户确认：同宿主内部多个advance之间没有让出事件循环。
- 从页面初始化用PerformanceObserver('longtask')采集全页>50ms任务，含渲染、预览与GC所在任务；采样末takeRecords。对同一正式计量窗口，ABBA两次B的次数/总时长均不得高于两次A；不能用仅在线host的统计代替。需报告是否支持和计量窗口。
- mean及完整生命周期mean<100ms、pending≤0.2秒、提交后可运行债务斜率≤0.001、点击p95≤100ms/max≤250ms继续有效。CPU4分支同步记录host、advance p99/max、longtask与点击；CPU4既有入口为常速至少40步准备+20次CPU4交互，不自动扩大为全程600步降速。
- 每轮前60秒CPU mean≤10%、p95≤15%；固定起点、同窗口A/A完整均值差≤5%且起点SHA相同才进行A/B。环境不合格仅作诊断；A/A失败停止，不重跑挑选。保留输入已有时间债务并在报告中注明，禁止把旧债务全部算成新增。长任务相对判定需要A/B完整证据，单独运行性能测试即使exit0也不构成准入。

本轮证据online-host-budget-20261106：同输入10/600步逐步SHA相同；FINAL-TARGETED.txt最终82通过/1旧基线失败（online-partial-cadence的CLOSED_RECOVERY_PROTECTED，before复现），另8项旧失败详REPORT。定向覆盖一宿主一次advance/12ms、跨真实宿主偏好/玩家写入stale、离开/导入取消、MessageChannel与timer、预览首次避让及paint/显式/长按/10J可用性。计量自检14/14。amount-online-scheduler旧<=3ms断言改为[12]，不放宽状态及守卫断言。

HTTP390两组ABBA均环境不完整合格；新口径B的host和longtask防线失败。正式CPU4 A/A波动8.84%，未进入B；本轮CPU4advance p99缺失已在正式入口补字段，未伪造或为该字段重跑失败入口。误扩展的CPU4长测（1次600步A与未完第二次）只作额外诊断，不替代正式入口。未跑全量、真机、APK、来源F方案。

以下为历史记录。

## 2026-11-06 锻炼按钮门槛刷新

node tests/training-availability-browser.test.cjs：真实App/动作入口，冻结游戏时钟；普通/0.2秒积压两组，10-1e-120仍禁用、恰好10触发新精确预览、只读、同一区间不逐帧重算、真实点击消耗10J得到1战力、扣款后禁用；仙三斩道最终收益不足1时仍禁用。WIS_PLAYWRIGHT指定已安装依赖，WIS_TRAINING_RESULTS指定E盘证据目录。测试需保留冻结Date.now，不人为加200ms，否则真实离开/动作保存路径会登记该段在线收入，余额不再是0。

相关Node回归：preview-backlog-scheduling、amount-training、amount-source-preview，共31/31。普通1秒/积压5秒刷新和16/100ms续算保持。未跑全量、页面性能、APK或发布版验收。

## 2026-11-06 下载弹窗首屏与滚动回归

app-distribution-browser新增elementFromPoint首屏下载按钮命中检查、上下界不被dialog裁切；320×568手机和1100×600桌面；展开SHA后滚动可达。网页版本/更新说明不可见、安装区不存在；原生更新仍检查原有行为。仅DOM存在或Playwright自动scrollIntoView不等于玩家首屏可见。证据目录app-download-dialog-fix-20261106。

## 2026-11-06 顶栏下载入口与网页发布同步

app-distribution-browser增加320px安卓入口和版本号相邻/同排/无溢出断言，不再打开设置后找入口。WIS_DISTRIBUTION_ROOT可指定发布目录，同一10组环境在开发/发布版运行；发布版额外检查Build release、调速及公式调试关闭和对应DOM已移除。WIS_DISTRIBUTION_RESULTS指定E盘结果目录。发布同步前后比较latest.json完整SHA，原存档及旧APK也保持指纹。使用sync-release --build release-0.2.0.0-20261106-app-download-r2做只读同步检查。

## 2026-11-06 安卓下载与更新提示验证

- node --test tests/app-distribution.test.cjs tests/rank-loop-cooperative.test.cjs tests/release-output.test.cjs tests/native-platform.test.cjs tests/native-backup.test.cjs：31/31。覆盖UA/格式/HTTPS、no-store/8秒超时/网络和非法JSON、实际versionCode比较、24h延期、首次事务后回调、导出/生命周期/本地备份、同步不生成或覆盖latest。
- tests/app-distribution-browser.test.cjs：Edge真实页面，Android/微信/QQ/iOS/桌面/模拟原生/file/404/非法清单9组。导出按钮调用原始导出且schema75；模拟原生在在线提交后读取、稍后持久化、外部导航意图；deferred时导出和稍后可用。测试game.js覆盖层仅注入deferred布尔值，不改生产数值。
- 桌面SVG二维码另用OpenCV独立解码为测试APK URL；android.png/desktop.png检查布局。模拟Capacitor不等于真机系统浏览器实测。
- rank-loop-cooperative旧setupFuture默认schema74不符合当前75装配，更新夹具显式targetSchema:75；不改既有断言。发布转换只在E盘隔离夹具执行默认--write与--out，不触碰实际发布版。
- manifest与Worker生成后--check：93/78。最终发布原文件与五份原存档SHA见INTEGRITY-FINAL.json。
- 未跑全量、页面性能、CPU4，未构建/安装新APK。用户任务前置声明真机通过，本轮没有设备证据，不记为本轮验收。部署后补测线上JSON/CORS、真实APK下载与原生系统浏览器跳转。

## 发版流程：网页下载与 App 更新清单（2026-11-06）

线上清单：https://wispower-3td729n.maozi.io/latest.json 。开发根目录 latest.json 是 example.invalid 测试样例，不能部署它。发布版/latest.json 由发版人员维护，sync-release 不生成、不覆盖，也不把开发样例带入 --out 输出。

1. 开发版更新 gameVersion、index 可见版本、build id；生成 manifest/Worker 并 --check，跑必要测试。本功能当前仅在开发版。
2. 取得本次同步授权后运行 node tools/sync-release.cjs --write。未经授权不得改发布资源；--out 只用于指定输出目录，同样保留其中既有 latest.json。
3. 在 WIS-App 更新 Android versionName/versionCode；每次发布 versionCode 严格递增，目前已交付 20004，下一包至少 20005。同一显示版本重包也要递增。npm run build-web → assembleRelease → 使用原兼容密钥签名 → 验签/设备验收；最终附件统一命名 wis.apk。沿用当前测试证书的包可覆盖已有安装，但不能把它描述成已配置长期正式发布证书。密码仅本地环境变量，不进入仓库。
4. 在 GitHub unaizenko/wis-infinite-power 的 Releases 创建草稿，tag 为 v<版本号>，上传签名后的 wis.apk，确认后发布。使用已经存在的 tag 时先核对附件，不能把旧文件的 hash/size 套在新文件上；建议每次公开发行使用新版本/tag。不可变发行版应在发布前附齐文件。参见 [GitHub 官方发行版说明](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository)。
5. 对最终附件计算 SHA256 和字节数，更新 发布版/latest.json 的 version、versionCode、apk.primary、sha256、sizeBytes、纯文本 notes 和实际 publishedAt（ISO UTC）；minAndroid 为 7.0。当前清单的 20004/hash/size 对应已交付的旧 APK，publishedAt 暂为清单建立时间；公开发布时应改为实际发布时间。不要提前宣称新版已上传。
6. 用户自行提交、推送，等待帽子云部署。浏览器直接访问线上清单，应是 HTTP200 JSON 而不是登录页/HTML。latest.json 建议 Cache-Control: no-store；App 从 https://localhost 跨源读取，响应需允许 Access-Control-Allow-Origin: https://localhost（公开无凭据清单也可为 *）。本轮线上读取为404，因此尚不能验证 CORS；不要使用 no-cors 绕过，否则读不到JSON。
7. 手机浏览器验证下载→安装→导入；确认清单 SHA/size 与实际下载附件相同、同签名覆盖升级保存进度。含本功能的新 APK 在首次在线结算后读取清单，只有更大的 versionCode 才提示；选“稍后”同版本24小时内不再提示，仍建议先导出存档。

PowerShell 校验（在E盘交付目录执行）：

    (Get-FileHash -LiteralPath ./wis.apk -Algorithm SHA256).Hash.ToLowerInvariant()
    (Get-Item -LiteralPath ./wis.apk).Length

Gitee 镜像：按 [Gitee 官方创建发行版说明](https://help.gitee.com/repository/release/create) 上传同一个已签名 wis.apk；从附件获取实际可直接下载的 HTTPS 地址，填入 apk.mirror。务必用未登录浏览器与手机验证，不填仓库页面/临时登录链接；下载后的 SHA256、字节数必须与 primary 完全相同。没有可用镜像时保持 null。网页说明框同时提供主链接和镜像；App 按要求以 primary 为“去下载”，镜像存在时也提供独立按钮。

本轮不上传附件、不同步网页发布资源、不构建新 APK、不推送。现有20004安装包尚不包含这次更新提示；必须在后续获授权打包后才生效。

## 2026-11-06 真葛立恒需求下限

- g-reward-floor：需求小于/等于/大于1；D6下降与容量上升跨界；真葛立恒挑战；高阶归一化费用；旧锚点资金/acc及存档往返；在线离线一致；小批数精确oracle；60组真实G输入。
- 必要回归：closed-form-batch、closed-form-newton、closed-form-reentry、rank-approx-settlement；存档apk-version-save；重新生成并校验Worker。
- 历史60步与旧rank-approx曲线的对照显式使用rewardAboveOne=false，仍保留原1e-13阈值。当前低需求路径改用无奖励精确多项式oracle，先断言整个区间需求≤1；高需求继续旧oracle，1e-12阈值不变。
- 三版本浏览器检查奖励说明、实际需求及发布调试开关；APK验证旧证书一致、manifest不可调试及资源一致。

## 2026-11-06 网页与 APK 发布、阶位显示

- rank-scientific-format 定向覆盖1000阈值、G/TREE共享格式、ee残差与只读性；display-e-ee / unified-large-exponent-display 保持中央大数显示合同。
- release-output 校验自定义输出与默认发布转换、生成后只读校验；manifest / Worker --check。
- 发布版与 APK www 分别运行秘境流浏览器入口；native-platform / native-backup / apk-version-save 保留存档及平台分支测试。
- release-0170 的旧恢复夹具导入预期与当前 CLOSED_RECOVERY_PROTECTED 保护合同冲突，不能计为全通过；其他浏览器覆盖和独立 file 启动检查见 REPORT。
- APK release变体，debuggable=false，webContentsDebuggingEnabled=false；用 apksigner 验签并与旧APK证书比较。userdebug模拟器会强制开放WebView，普通真机尚未验证。

## 2026-11-06 秘境流扩展定向验收

- `node --test tests/martial-shroud.test.cjs`：门槛与价格、累计神魂成本及独立积分 oracle、拆分投入、战神图录叠加、挑战禁用、实际入账、回滚、闭式大数、存档/重置及正式在线/冻结离线。
- `tests/martial-shroud-browser.test.cjs`：Edge 1280/390/320 实际购买、成就、宝物、挑战启动、只读渲染及溢出。
- `tests/martial-shroud-worker.test.cjs`：在线/离线 × 有/无心消费能力，与主线程完整状态、RNG、debt、存档一致；正神魂库存验证登仙台冻结边际产出。
- 同组运行相关 11 个测试文件，非全量测试。旧 `martial-balance-contract` 的14项断言/精度历史问题和 `martial-engine` 缺少 MartialAmount 的旧夹具失败，已用本轮修改前文件覆盖层独立复现，未放宽断言。正式新引擎路径另由新定向/Worker测试覆盖。详细逐项清单见本轮 REPORT。
- 唯一修改的既有断言：武道能力配置数量49→51；其余旧断言保留。构建后 manifest/Worker均须 --check。

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

本轮最终验证：19/19必要Node测试；原生模拟/网页保存与导入回归通过；Android16/WebView133模拟器两份存档各五分钟、实际分享、卸载重装、十分钟后台Worker、返回键和飞行模式冷启动通过。5项旧生命周期失败和旧release fixture保护在before同样复现，未改门槛。发布版93文件与5份原存档不变。APK实际构建需加载 ../WIS-App-Toolchain/env-ascii.ps1 并在 W:/WIS-App/android 使用 gradlew，W:只是原E目录别名。

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

### 本轮复现命令

`node --test tests/martial-expansion.test.cjs tests/amount-martial.test.cjs tests/martial-seven.test.cjs tests/martial-domain.test.cjs tests/martial-balance-math.test.cjs tests/martial-heart-evaluation.test.cjs tests/frozen-offline-contract.test.cjs tests/frozen-offline-treasure.test.cjs tests/frozen-offline-ordering.test.cjs tests/closed-form-batch.test.cjs`

真实页面：`node tests/martial-expansion-browser.test.cjs`；Worker：`node tests/martial-expansion-worker.test.cjs`。设置WIS_PLAYWRIGHT为E盘既有依赖；TEMP/TMP/FIXED_RESULTS均指向E盘证据目录。前者覆盖新能力点击、成就、法则UI、窄屏与挑战进入；后者对照最终bundle与页面本地引擎。新用例同时检查合作式挂起时零写入、失败原子性、total压缩下的实际收入收据，以及心支付双奖励不重记。

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

### 本轮可复验命令与证据

在真源执行 `node --test --test-concurrency=1 tests/closed-form-batch.test.cjs tests/closed-form-newton.test.cjs tests/closed-form-reentry.test.cjs tests/rank-approx-settlement.test.cjs`。将WIS_CLOSED_RESULTS/FIXED_RESULTS及TEMP/TMP设到E盘证据目录；闭式测试的G输入来自tests/fixtures/closed-reentry-g-inputs.json，迁移来自closed-migration-model1.json/closed-migration-schema72.json。

55文件列表及运行命令在证据目录wide-reviewed-run.json。首次新增旧.length断言失败保留为sparse-red-wide-reviewed.tap；修为严格无键后最终只剩已知14。旧精确内核断言未改。migration-check.cjs为真实旧档与保护验证；trajectory-browser.cjs E/O为数值轨迹（非正式页面性能入口），analyze-trajectories.cjs保留新旧口径与绝对时钟原始差异。

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

## 2026-11-03 最终限定宽回归与剩余性能矩阵

当前统一合同与数据见AGENT_CONTEXT.md首条；报告 ../WIS-项目资源/final-baseline-validation-20261103/REPORT.md。原54文件（已含最终rank-approx17项）加roam，共55文件在最终源码上同批串行运行：235项/221通过/14已知失败，新失败0。默认treasure-finite6000步，清除WIS_PLAYER_SAVE，原断言不变。

HTTP1280/file430600各一次，mean55.317/83.489ms，p99 7.3/8.3ms，max58/68.4ms失败；pending0.013/0.006s。file fail-fast导致CPU4未进入，原CPU4_ONLY单独补跑一次，仅测试包装把原CPU4块移到常速断言前；CPU4交互20次p95/max174.582/198.756通过原200/500ms门槛，但常速准备mean102.271失败，整入口exit1；CPU4末pending7.058是观测，未设新门槛、不归因GC。前三组C3收据不重跑，完整矩阵未通过。未跑全量或多轮稳定性/真实低端/600步全程CPU4。

以下为历史验证记录。

## 2026-11-03 C3：对象内私有缓存槽

业务仅amount-products.js：canonical row七缓存、factor两缓存及品牌、finalized数组四缓存迁入冻结前声明的私有槽。外部encodedInputs/normalizedInputs WeakMap及逐元素校验保持；owner/work/RankBudget/Amount表不动。裸系数直接算键不补章。原型/own keys/descriptor/序列化、防伪、数值/RNG/clock/debt/Save保持；build id仍row-brand-r1，以源码/Worker SHA区分C3，Worker72 SHA前缀23d3e63f2b4ad469。

必要Amount/Rank9文件96/96；新增amount-object-cache覆盖冻结后写既有槽、模拟拒绝晚盖章、null缓存及外部数组失效；engine原档8步完整状态SHA逐步一致。单次HTTP390600诊断MajorGC max/p95 112.598→47.899ms，总计825.559→374.735ms，次数11→14；总分配采样1.232→1.248GB未下降。正式40/320600/390600各一次通过，均值74.220/53.809/54.876ms，p99 6.7/7.0/7.1，max20.7/19.7/17.8ms，pending0.087/0.024/0.041s。不代表多轮稳定；未跑其余矩阵/全量、不扩范围。发布/原档保持，无commit/push。报告 ../WIS-项目资源/object-cache-20261103/REPORT.md，下方历史保留。

## 2026-11-03 canonicalRows私有品牌，性能目标仍未达到

开发build `dev-0.1.8.4-20261103-row-brand-r1`，84/72；schema75/model1/rule2/尾项及G/TREE合同保持。本轮只将amount-products.canonicalRows身份WeakSet替换为不可反射复制的语言私有品牌，canonical/negateRow在freeze前标记plain object。原型、own keys、序列化/防伪不变；negativeRows及其它缓存、owner memo未动。

新增amount-row-brand测试及相关8文件93/93，engine原玩家8步每步完整状态SHA一致。C1单次HTTP390600及C2相同诊断：第299/301步堆快照；canonicalRows原13755/13805条为首位，C2该表消失。区间外MajorGC max/p95 186.947→112.598ms，次数7→11，累计843.5→825.559ms；分配采样估计未下降，快照会扰动GC，不能证明稳定收益/逐表因果。

正式40/HTTP320600/HTTP390600各一次，前两组通过，390因max99.5ms失败。均值95.410/72.538/77.683ms，pending0.112/0.047/0.042s。未达到MajorGC<50ms或完整三组准入，不扩大弱表改动、不重跑挑结果；未跑全量/其余矩阵。发布和原档保持，无commit/push。详见 `../WIS-项目资源/heap-identity-20261103/REPORT.md`，下方历史保留。

## 2026-11-03 B1/B2必要验收

`preview-backlog-scheduling.test.cjs`11项覆盖0.15s合计阈值、5s/100ms/render、首次/显式例外、状态只读、hold/过期取消和退出积压最终刷新；`preview-backlog-browser.test.cjs`在真实页面积压0.2s记录DOM Paint先于首次吐纳精确工作，序列化state/RNG/clock/debt不变。与exploration-cooperative-preview/hold-scheduler/cooperative-ui/cooperative-browser/preview-refresh、breathing-small-preview、amount-source-preview共22项通过。roam-spirit-world-preview旧提交断言失败，新旧app只读覆盖同样失败，未放宽。

B1仅一次HTTP390600，原入口内存注入离散事件观察，开启v8.gc/devtools.timeline和1ms CPU采样。所有>16/>50切片的GC按主线程区间并集归因，函数为采样，事件为边界区间；探针约1.453ms/步另列，不作为性能准入。

B240短测用原amount-runtime-performance-browser；HTTP320/390各600通过test-only selector选原round，不改断言。三组exit1，切片max60.6/171/74ms，390pending0.203s亦超限。其余矩阵因前置门禁失败未执行。保存原收据gzip、退出码、所有慢样本与事后原阈值核算；不重复挑结果。TEMP/TMP和所有证据在E盘 `../WIS-项目资源/preview-backlog-20261103`，生产Step无诊断改动。

## 2026-11-03 正式40/600步性能验收

使用 `tests/amount-runtime-performance-browser.test.cjs` 的实际schema75入口，沿用原20步预热、20次设置点击与原断言。先设WIS_RANK_PERF_SMOKE=1跑40步，再清除此变量独立跑600步矩阵；WIS_RANK_PERF_CPU4_ONLY/WIS_AMOUNT_LATE_PROFILE均清除，串行执行。无全量功能测试、无额外Profiler或domain探针。

本轮40步HTTP320因pending0.272>0.2失败；600步HTTP320全组通过；随后HTTP390因单次105.10ms切片>50失败。p99分别7.20/8.80/9.90ms；平均97.10/76.48/86.98ms；完整生命周期平均96.45/77.10/87.50ms，仅采用39/599/599个完全落窗样本。HTTP1280/file430/CPU4因原fail-fast未执行。未放宽门槛，不用之后未执行的断言或阶段冒充通过。

证据 `../WIS-项目资源/rank-approx-admission-20261103`：两次原命令exit1及.log；smoke40.json.gz、sustained600.json.gz为完整原始JSON逐字节校验后的无损压缩；analyze.cjs可以直接读gzip，复用原debtSlope及完整计量校验，SUMMARY/VERIFICATION分别列出原测试失败及保存数据的事后门槛核算。原始文件包含全部切片/帧/提交债务/生命周期数据，不裁剪慢样本。生产、测试与玩家原档保持。

## 2026-11-03 阶位近似定向验收

新增17项 `node --test tests/rank-approx-settlement.test.cjs`：只经正式 advanceG/frozenG/M.advance 等入口，覆盖四规则×g=1e16/7.7e28/1e100×小/大批数×旧/有理资金，非负、limit、1000步Q精确守恒、安全整数/1e300/trueGraham回退、cursor重锚、Save、TREE exposure及符号重锚、失败回滚和微小G显示串解析。批数界1e-13×精确批数+1；exposure1e-14；典型重锚1e-15。总入账守恒测试从有理余额开始，旧符号入场保守折损另列，不混为无损。 最终审查补G/TREE无法认证向下比较的两例RED→GREEN，canRoundDown只捕获rank-cost-unresolved；逐操作分片确认suspension未被吞掉。修复后四文件25/25。

必要回归选择 rank-*、big-number*、frozen-offline*、d11-*、amount-online-measurement、Save/Recovery；不运行全量仓库或 rank-runtime-performance-browser 的600步矩阵。TEMP/TMP、FIXED_RESULTS在E盘，浏览器用现有WIS_PLAYWRIGHT/msedge。既有失败使用before独立Worker提取的精确源码只读覆盖逐项复现，不能把旧失败计作通过。

有意合同更新：rank-exposure原完整rankBudget deepEqual改为rank/其它预算字段/elapsedBudget仍精确一致，funding引起的progress按1e-14验证；rank-runtime-contracts只更新boosted.expected的TREE funding及superProgress，完整状态deepEqual仍保留。具体原断言、新断言/fixture差异见本批REPORT及fixture-contract-diff.json，不放宽其它断言。

原档engine固定输入8步新旧完整状态对照；HTTP320真实页面每次预热20步后8步ABBA，低成本阶段计时，关闭逐证明记录及CDP trace。墙钟含GC/调度/系统暂停，不是OS CPU；真实页面时钟不固定，不冒充相同输入，也不构成性能准入。build/manifest/Worker --check、发布93文件与原档SHA单独校验。证据 `../WIS-项目资源/rank-approx-20261103`。

## 2026-11-02 奖励阶位与间隔必要验证

新增amount-rank-gap-probes.test.cjs及helpers/online-rank-gap-probes.cjs；最终与amount-online-measurement共21/21（8+13）。覆盖真实任务恢复/已完成缓存、嵌套同步self时间、异常/容量/锚点、回调等待和区间排重。生产domain与gap各8步（预热20）串行，engine同输入探针开关8步全状态一致。无生产改动，无全量/准入。

证据../WIS-项目资源/online-rank-gap-20261102。gap-trace仅目标主线程窗口，performance.mark对齐；先扣结算再按GC/表现层/浏览器布局绘制/其它任务排重。ui/app.js2363/2494真实回调属于后台精确预览，不能全部称为DOM更新。计量边界1.5ms/8步单列；前轮47ms不可追溯分解。跨owner局部任务键同名不证明完整输入一致。

## 2026-11-02 四项低成本定向探针

新增tests/amount-focused-probes.test.cjs及helpers/online-focused-probes.cjs，最终与amount-online-measurement共24/24。覆盖实际Effects提供器次数、同同步任务live偏好写入仍被守卫拒绝、真实memo对象/键与完整输入关联、精度及抽样位数归属。全部为测试专用源码覆盖，不进入84/72装配。

原schema72存档预热20步后8步：生产plain/effects/formula各一次；最终engine探针开关8步全状态一致；3个慢公式完整输入与策略冷重放一致。生产计数用execution/probe-production.cjs版本；最终oracle/冷重放用含内核采样的当前helper，不能混用指标。最终冷重放stride1仅log/exp入口操作数，非全部中间BigInt。

没有生产补丁；同host守卫合并前提未证，不跳过检查。未跑全量、40/600步或其他HTTP/file/CPU4；性能未准入。输出/TEMP/TMP在E盘../WIS-项目资源/online-focused-probes-20261102，详见REPORT.md及VERIFICATION.json。

## 2026-11-02 成本归因必要验证

仅执行amount-online-cost-attribution、amount-proof-attribution、amount-online-measurement三文件，最终31/31。最终engine固定原档前20步后8步，探针开关完整状态一致；独立审查修复见online-cost-attribution-20261102/execution/review-{red,green}.txt。production诊断为两次8步plain、一次trace及唯一一次补充trace、一次CPU采样；旧语义成员派生统计失效，不可拿最终engine追认。G1/G2证据不足，未改生产、未跑全量或正式性能准入。

## 2026-11-02 准备结果复用的必要验收

当前online-prepared-results-r1。定向：奖励及COW39项、固定来源/共享准备31项、数值owner/公式68项、最终计量13项、另银海续算1项，共152个独立测试通过；中间重跑不能重复相加。新增计量文件tests/amount-online-measurement.test.cjs及test-only helpers/online-work-metrics.cjs；扩充奖励、固定来源和数值冗余文件。

38组局部原源码对照与20步真实玩家super逐步完整状态一致；局部夹具固定fresh初始RNG种子后比较，未剔除RNG。真实对照按原schema72存档、正式0.1秒/3ms执行。

原浏览器入口只跑一次WIS_RANK_PERF_SMOKE=1的HTTP320/40步：mean254.24ms、pending9.107秒，原均值断言失败；p99/max9.7/37.3ms为观测，不计后续未执行断言通过。新增fullMean253.926ms采用39个完全落窗attempt，保留40installed+1pending及两项跨窗；host另报，cpuMean仍是墙钟。最终审查后增加完整性/有效样本/fullMean<100检查，以及失败后close成本计入；13项定向验证通过，未重跑性能矩阵。

未跑全量、600步、其它HTTP/file/CPU4；既有online-catchup-presentation失败未重跑、未修改、不计通过。证据全部在E盘../WIS-项目资源/online-performance-plan-20261102/execution。原门槛未放宽，未证明稳定提速。

## 2026-11-02 冗余削减的限定验证

本轮新增amount-achievement-slice、amount-header-summary、amount-numeric-redundancy、amount-fixed-preparation-shared四文件，分别覆盖无提交不通知/独立渲染、顶栏分支与只读、严格私有键及副本、同步/分片作用域与取消失败。定向批次17/4/56/37/8通过，共122项；不要叠加中间重复批次。另online-catchup-presentation测试在setLastTickAt更新boundaryAt后比较此前状态而失败，before只读覆盖同样失败，原断言保留。

证据../WIS-项目资源/redundancy-reduction-20261102。runtime-compare.cjs baseline/current各20步，前4预热后16计时，原schema72存档正式0.1秒在线、真实TREE super，20步完整哈希一致。局部同输入键/副本计数不等于全进程编码降幅。旧源码40组顶栏及16组准备对照通过。

原amount-runtime-performance-browser仅WIS_RANK_PERF_SMOKE=1的一次HTTP320/40步，平均268.295ms、pending9.70秒，仍失败；p99/max9.1/13.9ms的观测不构成完整准入。未跑全量、600步、其它HTTP/file/CPU4。TEMP/TMP及输出全在E盘；阈值未改。详见REPORT.md和VERIFICATION.json。

## 2026-11-02 奖励/系数/G必要验证

本轮新增tests/amount-reward-coefficient-preparation.test.cjs（5项），与amount-products、amount-compaction-reuse、amount-rewards、amount-reward-work、rank-budget、rank-budget-session、rank-g-cost共104项通过。最后G粒度调整后仅复验新增/预算/会话/G四文件33项通过，批次重叠。旧源码独立覆盖507组，真实原72存档20步逐步完整状态比较含TREE super；未跑全量或另做Save全矩阵。

最终证据在../WIS-项目资源/reward-coefficient-preparation-20261102：count-current-final和bench-*-final3为最终版本，其余为中间隔离/调度试验。WIS_RANK_PERF_SMOKE=1的HTTP320原入口40步失败：平均356.945ms、pending13.84秒、p99 9.5ms/max53.6ms。阈值未改，未执行其它性能阶段；不能按并发系统负载豁免。所有TEMP/TMP/证据在E盘。

## 2026-11-02 来源内部续算的必要验证

当前build source-continuation-r1。新增tests/amount-source-continuation.test.cjs覆盖提供器前段不重复、Scale后段挂起保留前段、原Decimal结果、失败重启和候选交错/取消。与amount-online-work-reuse、amount-formulas、online-source-scope共62项通过；amount-fixed-sources、amount-source-preview、amount-player-source另29项通过。

真实原72存档内存覆盖前后对照及固定操作分片计数位于../WIS-项目资源/online-source-continuation-20261102。单次WIS_RANK_PERF_SMOKE=1的HTTP320观察46步通过，不能替代600步和HTTP/file/CPU4完整准入。输出及TEMP/TMP都在E盘，用户要求不跑全量。详见该目录REPORT.md、VERIFICATION.json、browser-smoke.json。

## 2026-11-02 六方向工作复用的限定验证

本轮用户要求仅必要测试，不跑全量。具体定向文件及批次见../WIS-项目资源/online-six-stage-20261102/VERIFICATION.json；新增amount-online-work-reuse.test.cjs覆盖常量/可变输入、来源恢复、规范系数、费用会话、有限奖励、显式TREE与投影别名。独立审查问题修复后37项奖励及新增回归通过；其余按变更路径分批验证。不要把重叠批次加总。

全部TEMP/TMP/测试输出仍在E盘。最终以WIS_RANK_PERF_SMOKE=1执行原amount-runtime-performance-browser：只跑40步HTTP，平均129.475ms/pending1.383秒/max69.1ms，未达标。600步、其余HTTP/file/CPU4未执行。32步旧Worker对照脚本与详细证据在本轮资源目录；不能当正式准入。下方为历史记录。

## 2026-11-02 当前前四项优化验收

当前 dev-0.1.8.4-20261102-online-work-reduction-r2。使用 ../WIS-项目资源/online-work-reduction-20261102/test-env.ps1，输出全部E盘。沿用rg展开amount-/rank-*.test.cjs、排除runtime-performance-browser，追加exact-ranks与三个exploration协作文件，concurrency2/timeout300000：641/641。原引擎42/42、原生命周期13/13；两个预览/动作入口、生产HTTP/file四组与四类存档重读通过。

prepared-copy/replay-draft/private-operation/exp-allocation/commit-memo-scope与原reward/player观察边界覆盖本批；80步独立前后状态/RNG/clock一致，32～512全精度独立oracle端点一致；32步压缩14active/0sync。

scope-performance-attempt{1,2,3}为最终r2原600步，均未完整通过。actual-performance*为中间r1；baseline-overlay只读运行原源码，不是当前准入。完整失败全部保留，原阈值未改。不能用VM耗时或缓存命中宣称正式提速。详细命令与限制见本批REPORT/VERIFICATION。下方为历史记录。

## 2026-11-02 重开与在线吞吐当前验收

当前dev-0.1.8.4-20261102-reopen-throughput-r2。先加载../WIS-项目资源/reopen-throughput-20261101/test-env.ps1，全部临时输出E盘。完整rg展开amount-/rank-*.test.cjs排除runtime-performance-browser并追加exact-ranks与三个exploration协作测试，concurrency2/timeout300000：624/624。原node tools/test-settlement-engine.cjs --browser：42/42；原六生命周期文件13/13；两个预览/动作浏览器入口另过。

新增amount-adaptive-certification验证唯一结果与中点两侧1e-60回退、legacy80入口；amount-load-budget-retention覆盖封存资金与上下文阶段、混合可变输入/默认份额/可变阶位和TREE参数/结果冻结；amount-input-check-allocation验证实际原容器键数组次数与原地变更失效。最终针对性18/18。

browser-paired-read.cjs比较同输入原/现源码、真实定时器和生产512/3ms，当前75三轮约0.27秒；旧75仍约7.12秒。production-browser四组不改Config；read-probe四类保存重读全状态相同；paired.cjs online 12为原源码全状态/RNG/clock对照。

原性能文件未改；串行独立三次600步平均96.86/78.97/86.00ms，pending0.279/0.001/0.169秒，max260.3/65.4/68.7ms，三次均未完整通过。attempt1/2/3原始采样全部保留，后续HTTP/file/CPU4未执行。不能用功能全绿或单次mean<100冒充性能准入。verify-static检查113语法与84/72生成物及输入/发布指纹；完整证据在本批REPORT/VERIFICATION。

以下为历史记录。

## 2026-11-01 读档/在线工作优化当前验收

当前build dev-0.1.8.4-20261101-load-online-work-r4，证据../WIS-项目资源/settlement-read-optimization-20261101。test-env.ps1把全部临时目录/输出放E盘。全量使用rg展开amount-/rank-*.test.cjs，排除runtime-performance-browser，追加exact-ranks与三项exploration协作测试；concurrency2/timeout300000，最终612/612。引擎原命令node tools/test-settlement-engine.cjs --browser，42/42。生命周期六文件：cow-materialization、import-recovery-lifecycle、import-transaction-storage、temporary-session、startup-phases、ui-state-boundary，共13/13；必须校验文件存在，不用猜测文件名。两个exploration预览/动作直接浏览器入口另行通过。

新增amount-load-continuation覆盖真正冷加载（不得先同步prepare暖模板）、单操作恢复、flat旧读、原输入/完整状态、取消、策略/schema变化及输入封存；amount-compaction-reuse覆盖owner边界；amount-commit-continuation覆盖资源间yield和完整同步结果；amount-kernel-allocation使用独立有理数端点oracle覆盖全部符号区间/32..512精度。amount-numeric-kernel的计数同时覆盖floor、ceil、quotientBounds，避免把重构后的计数盲区当算术失败；Loop边界仍检查不重复owner校验，改用已选3ms子片合同。正式600帧测试内容和阈值未改。

prechange-oracle.cjs用before/原模块重建独立前版本VM，与当前完整读档/12步在线全状态对照；生产browser4组不改Config；read-probe128包验证真实75数学与保存重读，read-browser按实际入口512包/3ms测量。旧75实际读取9.67秒完成，四种页面都ready/设置可开。

原性能命令单独串行运行，禁止同时跑其他测试/代理/Profiler：node --test tests/amount-runtime-performance-browser.test.cjs。最新首轮600帧平均133.03ms/pending21.261秒，未通过；后续轮次没有执行。全部失败采样保留，诊断profile-*脚本不作准入。verify-static.cjs检查语法/manifest/Worker/输入与发布指纹，不等于性能通过。

以下为历史记录。

## 2026-11-01 当前预览/性能/慢读复测

证据../WIS-项目资源/preview-performance-read-20261101。先加载该目录test-env.ps1（全部临时输出在E盘，清除性能smoke/CPU4_ONLY/profile变量），串行执行：node tests/exploration-preview-refresh.test.cjs；node tests/exploration-cooperative-browser.test.cjs；node --test tests/exploration-cooperative-preview.test.cjs tests/exploration-cooperative-work.test.cjs tests/exploration-hold-scheduler.test.cjs。两个浏览器入口和相关4项均通过，helper先检查实际夹具加载，不能以fresh启动代替目标高值输入。

性能单独执行node --test tests/amount-runtime-performance-browser.test.cjs；原测试内容/阈值/20帧暖机/600帧样本未改，WIS_RANK_PERF_BROWSER_RECEIPT保存全部采样。最新首轮HTTP320平均153.03ms、pending33.365秒，不通过；其余轮次因原测试停止未运行，不得计通过。性能测试期间不并行执行慢读/其他测试或profile。

随后串行执行证据目录read-probe.cjs与read-browser.cjs：实际未改写的生产75数值运行时/完整HTTP页面，对原72、上一74、高值74、旧75大尾项四种输入。普通三类读取与保存重读/设置成功；旧75 VM观察60秒和页面观察65秒均未完、任务有进展、原文未变，属于待解决慢读，非通过门禁。read-browser保留真实Date/计时器/预算，通过包装仅观察readWork/RankExact，不替换数学内核。不得把诊断进程exit0理解为旧75读取成功。

verify-results.cjs校验当前采样/已知失败分类、语法及源文件与输入/发布指纹；它不是性能准入命令。完整结果见VERIFICATION.json。本批仅测试helper和文档变更，未重复此前602/42/13全套；下方旧日期为历史记录。

## 2026-11-01 当前预算/引擎边界验收

当前build dev-0.1.8.4-20261101-budget-engine-boundaries-r1，Config75保持；证据目录`../WIS-项目资源/budget-engine-boundaries-20261101`。正式数值/阶位602/602、原引擎42/42、生命周期13/13通过；实际生产HTTP/file共4组通过。独立审查2项Important已修复并复归，无待办Minor；详见本批REPORT.md。

loadProductionNumericRuntime在tests/helpers/production-numeric-runtime.cjs直接加载生产bundle.source，不覆盖Config，并校验75/Amount装配。历史73/74测试仍显式隔离。合法外壳由Save.envelope生成，再定点注入错误；来源spy仅在query成功返回后累计完成次数，重入另计。预算断言同时保留原逻辑workOperations与真实budgetOperations；有限请求合计不超支。

用本批test-env.ps1设置全部TEMP/TMP/输出与既有Playwright依赖到E盘。完整数值/阶位集沿用rg展开、排除runtime-performance-browser并追加exact-ranks和三项exploration协作测试，concurrency2/timeout300000。引擎命令node tools/test-settlement-engine.cjs --browser，原42成员完整保留。生命周期原6文件合计13项。

新增检查覆盖Infinity/大有限/非法预算、过期deadline、取消/失效、最低探寻费用±1e-120、真实75 Worker原档/74/高值与缺模型拒绝，以及超大同因子商含尾项的同步/单操作续算。未重跑600帧性能验收，不能由42全绿推断吞吐达标。原旧能力预览夹具问题未纳入本轮通过计数。

下方旧日期段为历史结果。

## 2026-11-01 已启用75：当前测试入口

当前验收：594/594数值与阶位回归、13/13生命周期通过；结算引擎35/42组通过、7组未通过，已记录后续分析，未改门禁断言。当前75保持启用。

实际开发入口Config75、build dev-0.1.8.4-20261101-amount75-enabled；用户要求先启用，原整体性能门禁未通过的记录仍保留。证据目录`../WIS-项目资源/enable75-20261101`。不修改发布版，不重复600帧性能准入。

amount-enabled-runtime.test.cjs直接运行未改写的生产Worker/config，覆盖真正启用、极小收益保存、已提交在线速率和原玩家/74存档迁移。production-browser.cjs使用实际脚本与Worker（不覆盖Config），覆盖fresh HTTP、原玩家HTTP/file、设置、结算、收益文字及75导出重读。真实输入只在隔离浏览器调整墙钟时间戳，原文件未写。

历史测试继续显式隔离：rank-schema-fixture的setupFuture默认74、setupGuarded73为73，workerSource默认74；rank-browser-fixture接受targetSchema（默认74），amount-browser-fixture显式请求75。不要依赖生产当前版本来运行旧模型合同。exact-ranks中的实际生产配置断言更新75，不改变数学断言。

完整数值/阶位集仍用rg展开amount-*.test.cjs/rank-*.test.cjs排除runtime-performance-browser，追加exact-ranks和exploration-cooperative-preview/work/hold-scheduler，concurrency2/timeout300000。引擎和生命周期方法沿用下方。TEMP/TMP/FIXED_RESULTS/WIS_WORKER_RESULTS均使用本批E盘目录，WIS_PLAYWRIGHT沿用E盘已有依赖。

下方日期段是启用前的历史结果，当前计数以本批VERIFICATION.json为准。

## 2026-11-01 有界尾项候选的当前验收

开发84主脚本/72 Worker，Config74保持，未来75由amount-fixture/amount-browser-fixture显式启用。当前build为dev-0.1.8.4-20261101-tail-cap-work；75整体尚未准入。本批证据目录为 `../WIS-项目资源/tail-cap-20261101`。

完整主回归591/591、结算引擎42/42、生命周期13/13、开发JS语法103项通过。新增amount-tail-cap/owners覆盖24→≤8、独立有理数损失界、虚拟词项、1/10高层系数、保守支付边界、续算/取消、载入/保存、实际Infinity点支付及探寻展示统计；整数预算和真实已付/退款路径保持精确。

PowerShell先加载本批temp/test-env.ps1，使TEMP/TMP/FIXED_RESULTS/WIS_WORKER_RESULTS与WIS_PLAYWRIGHT保持E盘。用rg --files展开tests/amount-*.test.cjs和tests/rank-*.test.cjs，排除两项runtime-performance-browser；再追加exact-ranks、exploration-cooperative-preview/work/hold-scheduler，concurrency2、timeout300000。引擎执行node tools/test-settlement-engine.cjs --browser；生命周期覆盖COW、启动、导入恢复/事务、临时会话、UI状态边界。精确记录见VERIFICATION.json与原始输出。

性能必须独立串行执行node --test tests/amount-runtime-performance-browser.test.cjs，保留全部样本及原阈值。首组真实HTTP320宽600帧平均114.35ms、pending10.004秒、切片p99/max20.7/155.6ms，未过门禁；结束受限尾项最大24。后续HTTP/file/CPU4未执行，不算通过。统计延迟汇总尚未实施；75只有全套门禁通过后才能开启。

另有同一真实后段快照50帧的精确参考对照，检查58份局部压缩证书及资源主值/阶位/RNG/时间；完整金额允许本策略舍入差异，该诊断不能替代性能测试。旧能力预览测试的Save.read夹具未匹配Save.readWork入口，不在591项通过统计中，未据此宣布玩家UI故障。

以下旧日期节描述74及更早验收，其78/66和旧build不是当前脚本装配。

## 2026-10-31 当前开发74验收方法

当前正式开发装配为78主脚本/66 Worker，Schema74；旧日期段中的“未装配/73”是历史记录。结果及精确命令见本批E盘rank-runtime-efficiency-20261031/VERIFICATION.json。

全阶位集使用PowerShell展开tests/rank-*.test.cjs（排除rank-runtime-performance-browser），再追加exact-ranks，concurrency2、timeout300000。结算入口执行 `node tools/test-settlement-engine.cjs --browser`；生命周期另跑cow-materialization/startup-phases/import-recovery-lifecycle/ui-state-boundary。

rank-schema-fixture在正式74直接加载生产清单；仅在73内存隔离时插入九模块。setupGuarded73是当前代码的历史模式，produceRelease73是实际发布代码的只读producer，不能互相冒称。历史冻结/精度银行测试保持73原断言；实际74由rank-big-numbers-work、rank-known-implementation/worker、rank-schema-worker、rank-cooperative/browser及本批性能测试覆盖。

性能测试单独串行：热身20，HTTP三轮各600次0.1秒帧（320/390/1280宽），file一轮600帧（430宽），真Date.now和100ms定时器，CPU4另测20次输入。不得和其他CPU重测并行。原生指针派发至设置弹窗two-RAF绘制完成是输入计时区间，不含locator点击前的稳定性等待；原自动化计时作为独立诊断保存。硬阈值：平均wall<100ms，结束pending<=.2s，每次提交后可运行完整0.1秒帧债务的后半程全部样本回归斜率<=.001秒/秒（保留不足一帧的原始余量与全部500ms采样供对照），切片p99<=16/max<=50ms，输入p95<=100/max<=250ms；CPU4输入p95<=200/max<=500ms，CPU4吞吐单独报告。

TEMP/TMP/FIXED_RESULTS/WIS_WORKER_RESULTS全部指向本批E盘证据子目录，WIS_PLAYWRIGHT沿用rank-cooperative-admission-20261031/deps/node_modules/playwright。源码/生成物按实际清单全部node --check；manifest和Worker各--check。预改造的七份完整轨迹在tests/fixtures/rank-runtime-contracts.json，不得重录预期迁就实现。

## 2026-10-31 续算/前台/混合恢复门禁

新增tests/rank-cooperative.test.cjs、rank-loop-cooperative.test.cjs：内部操作限额/过期软预算推进、取消/过期终止、完整Meta初始化/投影、真实玩家Step与同步完整状态一致、巨大D4抵消/严格指数读取、G前缀重数/140段相邻历史、Save存储所有者、前台保存不重结算、补偿/cadence、旧同步Loop、失败抑制和独立动作逃生。旧rank-exact-cost中巨大D4仅存储拒算用例升级为新认证正费用。

rank-cooperative-browser.test.cjs在E TEMP生成临时未来74整页/Worker夹具，生产仍73。覆盖真实原档自带混合债务、HTTP/file刷新、设置输入、按原剩余cadence一次处理时间，以及缺失Save.readWork时原文保护。测试时冻结window时钟/禁用自动100ms定时器，手动推进剩余逻辑周期；不能用固定0.1追加后合法保留的尾量判定卡死。该夹具通过不等于正式启用74或持续吞吐通过。

全部TEMP/TMP/FIXED_RESULTS/WIS_WORKER_RESULTS设E盘。WIS_PLAYWRIGHT指向E盘已安装测试运行时。完整命令、数量、哈希及未过门禁见../WIS-项目资源/rank-cooperative-admission-20261031/VERIFICATION.json。当前42 engine/browser门禁必须同时保持。无实体手机/多日/全历史后端性能承诺。

## 2026-10-31 认证费用与累计曝光隔离门禁

新增rank-certified-math、rank-projection-admission、rank-exact-cost、rank-exposure、rank-g-cost、rank-certified-worker、rank-certified-lifecycle。Math/G oracle来自PythonDecimal150精确binary64输入/逐阶参考；必须保留fixtures。projection tests含299起点双向Node/Edge及原档严格回读、伪造版本和垃圾字符串拒绝。exact cost含百万TREE、微小欠付、正负溢出/下溢与候选数学scope恢复；G含挑战/奖励原顺序、累计余项、逆估计邻界，不用自身费用当唯一oracle。exposure含同来源分片/Save、高时间ULP、离线不追补。

fixture将Config73→74并追加九模块，正式不启用。新native5场比较本地/Worker/跨Node保存；lifecycle真实档34h完整冻结恢复，十亿阶6000在线步。111tests全命令及42engine证据见E盘rank-remaining-implementation-20261030/VERIFICATION.json。全部TEMP/TMP/FIXED_RESULTS/WIS_WORKER_RESULTS仍设E盘，需要先创建目录；WIS_PLAYWRIGHT指向现有Edge依赖。单测数量不代表激活或无限数量证明通过，内层操作分片与正式UI门禁仍待。

## 2026-10-30 正式预算与真实候选隔离门禁

新增 `rank-budget.test.cjs`直接测试正式Core API的独立有理数oracle、相邻边界、百万G有界查询及版本/容量/取消；`rank-known-implementation.test.cjs`走实际Meta/State/Save，覆盖ee20+37消费者、G里程碑单位、TREE余量、D10/NoD10/阶段停止、冻结单位、晚失败回滚与派生显示校验。`rank-known-worker.test.cjs`比较同浏览器本地与原生Worker完整状态、重载和失败/取消（含已支付raw/boosted预算）；不把历史外部原型测试当作正式路径测试。

内存future fixture在SignedLedger后加载Rank、RankMath、RankBudget、RankBasis、RankSettlement；它们的运行时依赖在调用时读取，正式Config73及69/57脚本不变。跨内核旧单位准入仍独立UNRESOLVED，见rank-schema-worker诊断。需要WIS_PLAYWRIGHT和全部临时环境变量指向E盘。标准42入口结算门禁必须继续通过。最终命令与数量见本轮VERIFICATION.json，测试通过不表示未来格式已启用。

## 2026-10-30 Rank Schema迁移门禁

新增`tests/rank-schema-fixture.cjs`只在内存加载时替换Config73→74并插入Rank/RankMath/RankBasis；不改正式配置、主清单或生产Worker成员。`rank-save-migration.test.cjs`验证真实Save/State路径、严格basis、旧整数/Decimal读取分类、先旧归一化/容量换算再升级、完整新档缺model拒绝/稀疏补1、原文与live/storage不变、旧schema和rule2恢复。`rank-schema-worker.test.cjs`追加未来模块至内存Blob Worker，与同浏览器本地完整状态对照；有效旧0/.25/1/5、科学指数回退、+37、真实玩家以及坏unit/缺basis拒绝。跨VM Decimal对照先使用各自owner序列化，不能把foreign Decimal传另一owner的BN当数值oracle。

另输出跨Node/Edge旧投影单位读取的独立ADMISSION诊断。它当前UNRESOLVED，不计作测试通过、不以同浏览器Worker通过替代跨内核可移植性。WIS_RANK_DIAGNOSTIC可指向E盘JSON；TEMP/TMP/FIXED_RESULTS/WIS_WORKER_RESULTS必须全部在E盘。正式Schema74禁用，后续需要可复现projection producer认证。

本轮组合命令包括新迁移2入口和此前全部rank/budget原型，最终50tests；标准engine --browser另行42入口。详细最终结果及未过准入条件见E盘rank-schema-migration-20261030/VERIFICATION.json；不作完整计划已完成或实体手机/多日挂机性能结论。

## 2026-10-30 精确阶位隔离门禁

单独运行 `node --test tests/exact-ranks.test.cjs tests/rank-math-foundation.test.cjs tests/rank-fixed-budget-prototype.test.cjs`。原型有效输入保存在E盘同级 `WIS-项目资源/rank-fixed-budget-20261030/fixed-budget-prototype.cjs`，不得清理为临时文件。`tests/rank-fixed-budget-worker.test.cjs`用真实Rank/RankMath在内存Blob Worker中追加原型，生产Worker与清单不改。TEMP/TMP/FIXED_RESULTS/WIS_WORKER_RESULTS仍全部指定E盘，WIS_PLAYWRIGHT沿用现有Edge环境。

覆盖旧0/.25/1/5工作→+37→JSON/Worker/分批、P5精确80/343、独立有理数powers/800普通G前缀/120可支付随机对照、百万G相邻界、首次0→3、坏记录、容量/取消/过期不复活、原文小数不足一阶、稀疏分数分批规范化。该测试不代表Schema74或游戏批量已接入；正式Save/Rank消费者/挑战奖励和自动化生命周期仍待后续验证。标准engine42入口另行验收；最终结果见本轮VERIFICATION.json。

本轮最终统一门禁：`node tools/test-settlement-engine.cjs --browser` 42/42通过（34结算入口+8浏览器入口）；见E盘本轮VERIFICATION.json。

验收追加：真实玩家file启动/刷新/设置与3场玩家/ee20全状态Worker用例见settlement-safety-worker.test.cjs。历史frozen-offline-browser需要兼容的原始暂停档，其手写宝物oracle未包含空玄·生，不用于本次实际schema72无暂停债务玩家档的门禁。6000帧连续生收益及31.65秒旧暂停恢复已完成，不以100帧冒烟替代。

## 2026-10-30 安全/退役验收（仅开发）

标准门禁tools/test-settlement-engine.cjs：34个入口，--browser追加本轮8个实际浏览器/Worker入口；新增save-shape-guards、finite-progress-invalid-input、stable-resource-ratios、tree-promotion-retention、breathing-small-preview、retired-private-implementations、legacy-settlement-readers、retired-settlement-solvers。旧local模型5入口随计算体退役。旧预算/StrongFeedback测试现在检查合法数据仍可读、旧计划明确拒绝、资源/RNG/时间不变；不声明旧模型重新认证。

读档坏数据须在有效导出后修改JSON测试，不能先造坏live再调用envelope（当前导出也会拒绝坏有限记录）。差分oracle是提取的原reader-only夹具，不加载旧求解器。有限signed carry及精确词项的负余额必须覆盖。原生Worker须按同浏览器全状态/RNG/debt对照；实际玩家四宽度/CPU4、HTTP/file及取消/替换仍是门禁。所有TEMP/TMP/FIXED_RESULTS/WIS_WORKER_RESULTS指向E盘。

rank-math-prototype是未获准接入的原型诊断：邻阶和相对幂测试通过不代表新批量完成；其分批预算反例要求仍被识别，见RANK_GATE.json。无Schema74写出。实体手机/多日挂机和完整历史模型测试未验证。

## 2026-10-30 旧求解器退役回归（仅开发）

标准结算门禁31/31通过。旧strong-feedback-kernel/consumer-guards求解模型诊断随实现退役；替换为strong-feedback-checkpoint（5项）和retired-strong-feedback（3项），新增retired-runtime-release（1项，内存目标执行真实发布转换）。不将删除旧模型诊断解释为当前公式加速认证。

reader覆盖合法/非法格式、原文/克隆/纯读取、预算v1/2/3、仅BigNum隔离、真实Save prepare/envelope及冻结恢复完整状态一致。old supported计划必须明确拒绝，资源/RNG/clock保持；脚本清单、Worker payload及source必须没有旧命名空间。原生Worker新增有效旧证书存档，与本地玩法state/RNG/统计/debt及Save一致。

新增legacy-checkpoint-browser要求HTTP/file两入口实际恢复完1秒旧证书债务、J123→124、旧namespace缺失、设置可用、无旧脚本请求或页面异常。真实玩家档breathing-startup-browser、Worker生命周期、startup guard、compatibility和ui-state-boundary已通过，保留四宽度CPU4及真实时钟在线要求。big-number-ranks-worker和xiuzhen-fifth-ninth-worker共8场原生Worker与同浏览器本地完整状态一致。compiled-recovery、import-recovery-lifecycle、startup-phases通过。exported-recovery-resume缺默认历史fixture，本轮输出SKIP，不计为已验收恢复；新增真实Save/Worker/浏览器旧证书测试不依赖该fixture。

全部测试TEMP/TMP/FIXED_RESULTS/WIS_WORKER_RESULTS指定E盘本轮temp；WIS_PLAYWRIGHT沿用现有缓存。86份运行JS语法、80脚本manifest和68成员Worker新鲜度通过；发布93文件及原档SHA最终一致。独立审查0问题，603组validator差分结果及错误消息一致。最终证据`../WIS-项目资源/retire-strong-feedback-20261030/VERIFICATION.json`；未验证完整历史/实体手机/多日挂机。

## 2026-10-30 同类终点及宏步资格回归（仅开发）

新增scalar-googol-endpoint：独立固定幂反导数、相邻舍入反例、层3/4、不同操作预算及无效输入；scalar-manual-completion：真实吐纳、23来源、探寻1e150变体、无B6旧慢档；scalar-caller-certificates：固定raw资格及全入口接线；local-discrete-qualification：fresh/历史/active/unknown组和空provider拒绝。
breathing-work保留未授证精度失败的完整状态不变，并要求已知有限档真正完成。breathing-startup-browser要求正式付款/完整收益、准备只读、隐藏/替换取消。preview-browser只统计action key，避免新共享吐纳work误计探寻；roam DOM替身补齐标准contains方法，未放宽原业务断言。
tools/test-settlement-engine.cjs现包含30个入口；strong正向测试为显式隔离旧数学模型，当前正式stock-decay契约必须拒绝，不得将此解释为当前加速已认证。原四项local保留完整精度/回滚/恢复断言。
E盘证据scalar-work-fix-20261030；发布与玩家原档哈希保持。数学proof见specs。验收完成：标准结算30/30、相关领域33tests、12个浏览器/Worker入口通过，8场原生Worker与本地完整state/RNG/debt一致；真实玩家吐纳和探寻变体完成、23来源只读完成、四宽度CPU4、取消/替换/真实在线通过。5组原正常吐纳与未修改发布完整state/RNG相同。86运行JS语法、80脚本manifest及68成员Worker新鲜度通过。独立数学与整体审查剩余Critical/Important/Minor均0；预算与拒绝恢复回归已保存。发布93文件和原始玩家SHA保持。实体手机、多日挂机及完整历史套件未验证；未知数学资格或舍入边界仍保守处理。最终证据../WIS-项目资源/scalar-work-fix-20261030/VERIFICATION.json。

## 0.1.8.4 发布验收（2026-10-30）

沿用tools/sync-release.cjs转换。release-0170版本断言更新为0.1.8.4；breathing-startup-browser按Build区分开发公式详情与发布无调试入口，可用WIS_GAME_ROOT指向发布版验证真实玩家档。验收需覆盖两侧manifest/Worker新鲜度、发布所有脚本语法、四宽度无调试及file启动、真实旧档启动/设置/取消/精度失败原子性，以及原生Worker与本地完整状态/RNG/debt。该极端档吐纳仍明确precision-stalled并保留资源；不宣称完成了积分。标准engine原5项旧诊断失败保持，不属于本次新增失败。临时输出仅E盘。

实际验收：开发2入口4tests、发布15入口35tests，发布12个浏览器/Worker入口均通过（含8场原生Worker对照）。两侧86份JS语法、80脚本manifest、68成员Worker、90资产发布转换检查通过；原始玩家档哈希保持。未运行全部历史套件或实体设备。必要结果见../WIS-项目资源/release-0184-20261030/VERIFICATION.json。

## 2026-10-30 吐纳候选与同类预览（仅开发）

breathing-work.test.cjs覆盖真实档精度循环诊断/不支付、不消耗RNG、取消/状态替换、普通档候选与同步完整状态一致及单次提交。breathing-source-audit.test.cjs逐项审计23种来源，允许完成或明确precision-stalled，拒绝超时/持久写入。breathing-startup-browser.test.cjs使用真实玩家fixture验证启动、原离线恢复、所有页面只读、公式详情与设置、失败吐纳无副作用、隐藏及替换取消、四宽度、CPU4倍以及未冻结时钟的在线/预览完成。

tests/fixtures/breathing-stall-player.json为用户提供的有效输入副本（原始E:/download文件未修改）。不得为了测试通过削弱数据或返回部分积分。该档精确表示进入确定循环，因此期望明确precision-stalled并不提交；普通可完成结果必须保持原式与完整state/RNG。现有exploration-cooperative-*、integration-cycle-budget、deferred-action-owner及冻结离线/导入合同仍需通过。标准engine原5项旧诊断失败见下文，不能宣称全绿。所有临时输出仅E盘，发布哈希应为零变化。

## 0.1.8.3 启动/临时会话回归

新增startup-guard-browser（独立恢复、四宽度、原始下载/复制、存储拒绝、脚本/语法/接口/build故障）、startup-phases（保存/动作门控及同步/异步失败）、startup-paint-browser（CDP实际Paint、CPU4倍、隐藏/无rAF）、startup-compatibility-browser（缺at/hasOwn/dialog、键盘/触摸与无BigInt备份）、temporary-session（动态策略/前台pending/背景/取消导入）、temporary-session-browser（真实时钟J增长、原raw不变、Worker0、失败及成功导入）。浏览器工具沿用WIS_PLAYWRIGHT/msedge；所有TEMP/TMP/FIXED_RESULTS/WIS_WORKER_RESULTS指向E盘。

UI只读加载器保留内联启动保护，允许boot原生rAF/短task并等待canPerformSavedAction；不再禁用所有timer，只按测试目的冻结logic interval。传统独立Node App替身的模块列表增加dialog.js。新guard不计入外部清单，当前80脚本；Worker仍68成员（排除UI.Dialog）。

发布功能测试使用WIS_GAME_ROOT指向发布版；release-0170验证四宽度版本/无调试/速度×1/只读/两旧档/file入口；同一脚本名保留兼容。标准engine已知5项旧失败不作为通过，见AGENT_CONTEXT与本次VERIFICATION记录。

## 0.1.8.2 发布同步（2026-10-29）

按用户要求，将开发版与本地发布版统一为0.1.8.2；build分别dev-0.1.8.2-20261029和release-0.1.8.2-20261029。同步全部当前正式内容：平滑双重对数宇宙获取与收益配套、G/TREE大数阶位、顶栏高阶量级、描述与能力界面修正，以及已有永久高阶历史等。下文“仅开发/尚未同步”均为历史状态，本次已同步。

沿用tools/sync-release.cjs生成发布代码；移除调速按钮、Alt+S调速、公式调试面板及其计算、UI测试入口，release开关关闭且正式速度固定×1，性能诊断默认关闭。正常收益预览/自动化/离线恢复保留。开发调试仍可用。两侧JS/CSS缓存、manifest和Worker刷新；Schema73/rule2/正式存档key不改。本次不再调整数值、RNG或clock/debt。

发布实际代码：13个相关领域文件74个Node入口通过，覆盖新宇宙/能力/费用、大数阶位、高阶历史、成就、武道与冻结离线。真实Edge四宽度320/390/430/1280验证版本、无调试、Alt+S固定×1、导航只读、性能诊断关闭与无横向溢出；两份旧存档重导出及实际file://启动通过。发布超大G/TREE三宽度、第五至九步/本源预览三宽度、实际转生/历史恢复三宽度通过；8场原生Worker在线/离线与同浏览器本地完整玩法状态、RNG/debt和Save一致。

本次仅本地发布目录同步，未commit/push或上线部署。当前宇宙收益配套的长期平衡和实体手机性能未验证；此前标准引擎5项旧诊断失败见上一节及universe-smooth-20261029验收，本次没有修改其相关机制。最终语法、生成物一致性和开发公式哈希结果见../WIS-项目资源/release-0182-20261029/VERIFICATION.json。

## 2026-10-29：平滑宇宙获取与收益配套（仅开发版）

开发build dev-0.1.8.1-20261029-universe-smooth-benefits；版本0.1.8.1、Schema73、结算rule2及存档key保持。本节覆盖下文单对数分段压缩/库存阈值、旧能力倍率与道无涯/道源费用。

正式L(x)=10ln[1+ln(1+x/10)]，D(q,T)=sqrt(1+q/T)；N/M的T=1000，高阶系数T=10，无玩法分段或硬上限。单体基底(P/1e4)^.25/300，经L后乘内天地、尊阳、虚本源，再除D；多元为L(sqrt(N/1000))/D(M,1000)。高阶基底L((P/1e12)^.25)，先一次(1+g)^(2/k)-1，再乘六，最后除D(H,10)。

n=lg(1+N)，m=lg(1+M)，o=lg(1+O)，p=lg[1+lg(1+P/1e4)]。神融sqrt(1+10n)，法随1+.2ln(1+n/2)，道无涯1+.5ln(1+m/2)。内天地(1+p)^.25、尊阳1+.35ln(1+n)、虚本源1+.1ln(1+o)改在单体压缩后；六1+.5ln(1+o)改在高阶削弱后，不重复旧倍率。道无涯/道源消费300/3000M。C3、七八九、成就、高阶费用/升阶门槛/取根、库存及永久最高记录不改。来源预览与本源宝物卡复用正式能力入口，封印预览为中性。

BigNum全程保留；小量ln(1+x)数值稳定展开只是同一函数的求值手段。在线仍0.1秒，离线冻结起点最终率；不更改RNG、clock/debt或Save结构。旧高值库存的微小新增可能低于Decimal库存表示精度，不能据此把正速率判作0。

验证：新增7项先失败后通过；相关13文件63个Node入口通过（含第四步内部10子项）。标准结算工具25套中20通过，5项旧诊断失败在修改前后相同：strong-feedback-kernel、local-discrete-guards、local-discrete-hidden-income、local-discrete-settlement-failure、local-discrete-macro-reference。没有扩修旧诊断或放宽其断言。
真实Edge1280/390/320完成第五至九步、高阶及第四步购买/预览/Save/只读；本源卡O99实际倍率及封印中性先复现旧UI失败再通过。20场原生Worker在线/离线与同浏览器本地完整状态、RNG/debt/Save一致。85运行JS语法、79脚本manifest及68成员Worker新鲜度通过。独立审查发现本源卡旧倍率并已修复关闭，其余无阻塞。

三个合成阶段相同起点各新旧300游戏秒联动，不固定涅力，策略为即时可负担购买/升阶且无限点充足。第五步起点的新方案300秒N约9931/M1381/k28/P7.18e83，旧方案约7468/1548/k21/P5.28e16；收益补偿明显加快该合成起点的后续境界推进。不是实际玩家耗时或长期平衡结论，不擅自改变已批准系数。未验证实体设备、真实后期玩家档、数日平衡或稳定性能。
发布版92文件SHA256保持；未commit、push或部署。简要记录及可复算联动：../WIS-项目资源/universe-smooth-20261029/VERIFICATION.json、COUPLED.json。

## 2026-10-29：三类宇宙产出压缩与库存衰减（仅开发版）

开发build dev-0.1.8.1-20261029-universe-decay，版本0.1.8.1/Schema73/rule2/key保持。评价新曲线使用相同阶段起点的联动轨迹，不将旧截图涅力当作固定输入或新目标。

定义C(r)=r（r<=10），否则10*(1+ln(r/10))；D(q,K)=1（q<=K），否则sqrt(q/K)。正式N/M每秒收益分别为C(原最终基础N率)/D(N,1000)、C(sqrt(N/1000))/D(M,1000)；技能倍率先合并再压缩。高阶体系原始率先对(P/1e12)^.25*六倍率做C压缩，然后保留一次(1+G)^(2/k)-1削弱，再除D(当前高阶系数,10)。未封顶，低产出段不变，已有库存不减少；高阶价格/升阶取根/永久阶位/最高记录、道无涯和其他能力指数不改。M输出已补自身动态依赖，来源公式详情显示压缩及库存衰减。

在线保持正式0.1秒起点结算；离线仍冻结起点最终率，不随新增库存重采样，因此长离线和持续在线不要求相同数量。没有新增持久字段或更改RNG/clock/debt规则。

同一正式引擎的三个合成阶段起点各作新旧300秒对照；第三步起步两者相同，第五步起点的300秒结果N约118365→7468，M约2768→1548，涅力约1.80e17→5.28e16，高阶23→21。它们是代表性策略对照，不是真实玩家耗时或数日平衡验收。

验收：新7项定向测试，主要10文件46个Node入口通过；第三步起步/离线、离线恢复和三指数保护补验通过。12场在线/离线原生Worker与同浏览器本地完整状态、RNG、debt、Save一致；修真/高阶实际UI各1280/390/320与只读边界通过；85运行JS、79脚本manifest、68脚本Worker新鲜度检查通过。third-step-settlement旧法随身动^1.2断言在修改前后同样失败，未扩修。发布版92文件哈希未变。未执行全历史、实体设备、玩家实际存档或长期平衡测试，不宣称性能变化。见../WIS-项目资源/universe-decay-20261029/VERIFICATION.json。

## 2026-10-29：G / TREE 大数阶位（仅开发版）

开发build dev-0.1.8.1-20261029-big-ranks；游戏版本0.1.8.1，Schema73，结算rule2和存档key不变。解除购买D1-1/D1-2后的MAX_SAFE_INTEGER阶位封顶；未购买仍为G64/TREE3门槛。安全整数保留原Number计算路径，超大阶位复用BigNum；可展开整数以精确科学计数串保留逐阶增量，更高e/ee值按现有Decimal精度。rankValue/rankAdd/rankCompare统一读入、增阶与比较。超过单位表示精度时保留进度及signed账本，不伪造升阶或扣费。

补齐G/TREE正式及冻结批量结算、D4需求、G-T与D11倍率、转生收益、挑战成就、预测器门槛、符号比较和UI中央格式化；高阶完成文案不再写死G64。旧档可导入；新Schema防止旧构建静默截断超大阶位。资源公式/费用顺序及RNG、clock/debt合同不改，越过旧上限的后续进度是本次授权变化。发布版未修改、未提交或部署。

验收：新增12项Node大数回归；1280/390/320三宽度共9个大数UI场景；4场原生Worker与同浏览器本地在线/离线完整状态、RNG/debt/Save一致，既有D11两场Worker及UI只读通过。144组固定时钟/RNG的安全阶位完整状态及冻结结果与修改前一致。独立审查发现的搜索范围、ee门槛与费用平台阻塞已修复并复核。tree-late-rules-browser旧0.00%断言在修改前后同样失败（实际0%），未扩修。未运行全历史套件、实体手机或长期性能。完整清单及最终测试数见../WIS-项目资源/big-number-ranks-20261029/VERIFICATION.json。

## 2026-10-28：顶栏高阶多元显示验收

仅开发build dev-0.1.8.1-20261028-high-scale。真实Edge在1280/390/320px各验证12场景：普通/单体/多元、仅C6、N³/N^17/N^82、零库存、封印、体系切换、永久阶位尚未恢复及实际点击首次突破。保存重读、渲染只读及无横向溢出通过。
既有 `node tests/multiverse-scale-browser.test.cjs`、`node tests/high-multiverse-browser.test.cjs`、`node tests/ui-state-boundary.test.cjs` 均通过。`node --check js/ui/app.js`、`node --check js/core/build-config.js`、manifest/Worker `--check` 通过。测试TEMP/TMP均在E盘。发布版92文件哈希不变；未运行全历史、实体设备或性能套件。简要证据见 `../WIS-项目资源/high-multiverse-scale-20261028/VERIFICATION.json`。

## 2026-10-28：描述-2 定向验收

- Node：`node --test tests/descriptions-20261028.test.cjs tests/high-multiverse.test.cjs tests/high-multiverse-retention.test.cjs tests/xiuzhen-fifth-ninth.test.cjs tests/martial-seven.test.cjs tests/fourth-step-immortal.test.cjs`。37个Node入口、第四步内部10子项，合计46实际场景全部通过。
- 浏览器：`descriptions-20261028-browser.test.cjs`覆盖1280/768/390/320；`xiuzhen-fifth-ninth-browser.test.cjs`、`martial-seven-browser.test.cjs`各覆盖1280/390/320。含免费能力卡、唯一ID、隐藏过滤、指定文案、分组排序、真实购买、只读和横向溢出。
- Worker：`xiuzhen-fifth-ninth-worker.test.cjs`默认与`WIS_UNCAPPED_PROBE=1`各4场，后者三指数均超过旧上限，比较在线/离线完整状态、RNG、debt和Save；N/N²原有规则保持。
- 浏览器设置WIS_PLAYWRIGHT为现有依赖路径，TEMP/TMP/FIXED_RESULTS必须在E盘。FIXED_RESULTS可选，仅调试时生成截图。85运行JS语法、manifest/Worker检查通过；发布版92文件哈希未变。
- 未运行全历史套件、实体设备或长时间性能验收。详细规则、文件及结果见`../WIS-项目资源/descriptions-20261028/REPORT.md`。

## 0.1.8.1：永久高阶多元阶位与最高记录（2026-10-25）

本次修改高阶多元的重置合同：付费order/owner与按阶数优先比较的highest永久保留；除散功原样保留库存外，重修、挑战、无限转生、无限洗点、圆环入场只清amount/total/peak。原升阶消费不退款；洗点仍只退无限强化实际付款，C6洗掉后需重购并满足第五步前置。第五步恢复后在保留阶位直接产出，无重复激活费用；系数门槛与下一阶费用延续原阶数。不会把保留阶位提前当作本轮已达到的有效N阶位，顶栏/无限点倍率等仍依当前体系可见条件。

无限界面在体系未恢复时也显示已保留阶位、当前0库存、跨转生历史最高数量；与其他体系切换不丢失。第七步在本轮再次购买后读取永久最高记录，文案同步更新。新历史行继承大阶数换行规则。现有存档字段足够，Schema72/rule2不变；旧存档可从其仍保留的order/peak补最高，已被旧版清除的记录不伪造还原。下文旧“无限转生清阶位/本轮最高”描述被本节替代。

开发build dev-0.1.8.1-20261025，发布目标release-0.1.8.1-20261025；用户明确要求本次同步发布并取消调试。新保留合同5项Node先失败后通过，与原高阶10/修真7/三成就8共30项通过。真实UI1280/390/320宽度覆盖实际点击转生、零库存、记录显示、重载、第五步恢复和80位阶数字符串；四场真实Worker覆盖在线/离线以及尚未恢复/已经恢复来源，与同浏览器本地完整玩法、RNG、debt、Save一致。详见../WIS-项目资源/release-0181-20261025/VERIFICATION.json。
本次已完成发布同步：release-0.1.8.1-20261025。发布代码38项Node、保留进度UI三宽度、Worker四场、发布四宽度无调试/只读/Alt+S无效、两份旧档和file启动全部通过；开发圆环保护另9项通过。独立审查复跑30项通过，无阻塞或延后问题。仅本地发布，无commit/push/线上部署。


## 开发与发布版 0.1.8.0（2026-10-25）

按用户要求更新至0.1.8.0并同步当前开发内容到本地发布目录。开发build dev-0.1.8.0-20261025；发布build release-0.1.8.0-20261025。包含C6及独立高阶多元系统、修真道第五至第九步、无限多元/银海/厚土成就、七项武道能力和此前全部正式内容。下文各功能“仅开发/未发布”是开发时历史记录，本次已同步。

沿用tools/sync-release.cjs发布转换，移除调速按钮、Alt+S、来源公式调试面板及计算、UI测试入口；release开关关闭、速度固定×1、性能诊断默认关闭。开发调试保持；两侧JS/CSS缓存、manifest与Worker刷新。Schema72/rule2/存档key不变，未改玩法公式。82份非版本/非生成开发运行文件同步前后哈希保持。

实际发布代码43项Node测试通过（武道10、高阶10、修真7、三成就8、第七颗树8）；武道真实UI三宽度及12场新系统在线/离线Worker对照通过，覆盖全状态、RNG、debt、Save。发布烟测320/390/430/1280宽度无调试、导航只读、无横向溢出；两份旧档导入重导出、实际file启动通过。两侧85份运行JS语法、79脚本manifest与68脚本Worker新鲜度、89项发布转换一致性通过。仅本地发布目录同步，无commit/push或线上部署；未跑全历史套件、实体设备或长期性能。精简记录../WIS-项目资源/release-0180-20261025/VERIFICATION.json。

## 武道七项能力（2026-10-25，仅开发版）

开发版本仍 0.1.7.13；build dev-0.1.7.13-20261025-martial-seven。发布版未改，Schema72/rule2/存档key不变。

新增天魔策/慈航剑典各200神魂，要求先天、当前心200；实际消费每1心基础给予10气/体。手动/自动神魂转换与Registry心支付均在全部扣费后按候选库存/心计算，再叠丹劲和基因源能并走原长生诀直接收入积分减速，包含即将收入；前置门槛、set、重置、零额、失败支付不触发。预览只读且复用相同奖励函数。

宇宙流：基因源能9级，神魂费用200×2^(等级−1)，每级获取倍率×2，满级×512，仅首次解锁需气体1000/心120，后续升级只需神魂；作用凝气、锻体投入效率和直接气体收入，随后原减速。水晶冥想600魂、基因源能/心300前置，炼心神魂投入效率×5。秘境流：苦海1000魂/气1e4；命泉2000魂/体1e4/苦海；神桥5000魂/心1000/命泉。三者分别以1+[log10(1+气/体/心)]²乘呼吸法/极限运动/鬼背的原倍率，不凭空解锁原强化。神桥仅在武道且鬼背已购买并激活时取消J×0.75惩罚并增强战力。

沿原能力存档/转生清除规则，无新持久字段。现有宇宙、秘境占位页正式接入卡片与购买升级；行动预览显示消耗心奖励，鬼背与原强化预览同步倍率。Scale Effects声明martialQi/Body/Heart动态依赖。在线保留0.1秒正式结算；离线沿起点冻结长生诀收益，不运行自动兑换。

针对性验证：新增10项Node、原长生诀14项、罡劲丹劲7项、冻结离线13子场景；真实UI 1280/390/320宽度购买/满级/存档/只读/无溢出；4场在线离线Worker与同浏览器本地完整玩法、debt、RNG、Save一致（仅排除宿主时间戳）。85运行JS语法、79脚本manifest、68脚本Worker检查，发布91文件哈希未变。没有全历史套件、实体设备或长期性能验收。详细数值及文件见 ../WIS-项目资源/martial-seven-20261025/REPORT.md。

## 高阶多元基础系统验收（2026-10-25）

## 三项高阶多元成就（2026-10-25）

新增multiverse-achievements.test.cjs 8项、multiverse-achievements-browser.test.cjs三宽度、multiverse-achievements-worker.test.cjs四场全部通过。保护seventh-tree、xiuzhen-fifth-ninth、fourth-step-immortal、frozen-offline-contract、infinity-c4-ring及ui-state-boundary。浏览器设置WIS_PLAYWRIGHT，TEMP/TMP/FIXED_RESULTS指向本次E盘临时目录。覆盖+3与乘算、成就分类/当前阶位、银海小数及无重置、厚土正式奖励、Worker全状态/Save/RNG/debt、失败候选回滚和冻结收益；见../WIS-项目资源/multiverse-achievements-20261025/REPORT.md。


## 修真道第五至第九步定向验收（2026-10-25）

node --test tests/xiuzhen-fifth-ninth.test.cjs tests/high-multiverse.test.cjs tests/fourth-step-immortal.test.cjs tests/xiuzhen-statistics.test.cjs tests/infinity-reset.test.cjs tests/infinity-c4-ring.test.cjs

浏览器：xiuzhen-fifth-ninth-browser.test.cjs、high-multiverse-browser.test.cjs、ui-state-boundary.test.cjs；生产Worker：xiuzhen-fifth-ninth-worker.test.cjs。设置WIS_PLAYWRIGHT，TEMP/TMP/FIXED_RESULTS指向E盘。新领域7项覆盖5境界、能力与正式指数/自动化、历史升阶消耗/保存重置；三屏宽验证按钮和零库存，四Worker场景验证正式来源、在线反馈与离线60秒起点冻结。旧loader已补高阶模块加载。详细结果/范围见../WIS-项目资源/xiuzhen-fifth-ninth-20261025/REPORT.md。


high-multiverse.test.cjs初始8项全部因功能缺失失败；最终10项通过：C6/原子升阶/500-550-605费用/系数10门槛/N-N²库存不变、微小与ee增益、超过安全整数的阶数、Save/旧档/非法状态、四种顶栏状态及零库存、重置/封印/洗点/通用资源支付。审查提出带符号支付问题，补测先失败后修复通过。与infinity-power-c5、seventh-tree、fourth-step-immortal共25入口通过，后者内含10子项。

high-multiverse-browser.test.cjs三宽度1280/390/320：实际C6购买、N²→N³→N^4→N^5、每次费用/门槛/三份库存、保存后刷新、顶栏4态和零余额、封印与切换体系、渲染只读、正式0.1秒提交速率及80位阶数不溢出。超长阶数初测溢出，补充仅新高阶区域换行后通过。high-multiverse-worker.test.cjs四场online/offline×无来源/测试恒定7/s来源，通过主线程同浏览器与原生Worker完整状态、低阶产出、Save/RNG/debt对照（只排除宿主时间戳）；正式体系仍未加入新产出，测试注入不进入产品。

multiverse-scale-browser原3宽度24场景通过，其中封印时N/N²同时显示的旧断言按用户新要求改为仅显示最高可见资源；其余断言保留。ui-state-boundary通过。两份既有旧档重读/重导出补锁定高阶默认通过。85运行JS语法、79 manifest/68 Worker新鲜度通过，发布版91文件哈希完全未变。当前开发0.1.7.13/build dev-0.1.7.13-20261025-high-multiverse；Schema72/rule2未变。不含完整历史套件、实体设备、非恒定未来来源或长期性能验证。

记录../WIS-项目资源/high-multiverse-20261025/VERIFICATION.json，测试临时文件仅在E盘并清理。

## 0.1.7.13发布同步验收（2026-10-19）

WIS_GAME_ROOT设为实际发布版，seventh-tree/infinity-power-c5/infinity-reset/infinity-c4-ring/xiuzhen-statistics/tree-construction-retention六个Node文件39入口全部通过。seventh-tree-browser三宽度及在线跨TREE10/离线补成就2场原生Worker通过；xiuzhen-statistics-browser三宽度各17场景通过；tree-super-toggle-browser三宽度D10开关、D8/D9库存保留及D8/D9/D10/D11×online/offline共8场Worker与本地全玩法/RNG/债务/Save对照通过。

release-0170测试版本断言更新0.1.7.13：四屏宽版本/导航/只读/去调试/Alt+S无法改变×1、两份既有存档导入重导出、实际file://启动通过。两侧各84运行JS语法、78脚本manifest/67 Worker新鲜度、88项发布转换一致性通过；81个非版本/非生成开发运行JS与同步前哈希一致。保持Schema72/rule2/saveKey。仅本地发布同步，无线上部署或Git提交；未跑全部历史测试、实体设备或长期性能。

简要记录../WIS-项目资源/release-01713-20261019/VERIFICATION.json；临时证据与浏览器目录仅E盘，完成后清理。

## 第七颗树成就验收（2026-10-19）

新增seventh-tree.test.cjs 8项覆盖TREE10阈值、普通分组/纯查询、未解锁旧曲线、3/4/6/9/13序列、固定+3与两类倍率/向下取整、真实转生记账、Save/后续轮次、洗点退款、圆环零收益和最大合法TREE阶位。初测5项直接暴露缺失实现，另1项测试夹具使用非法TREE2，已改为合法未抵达TREE的rank0；实现后8项通过。连同infinity-power-c5、infinity-reset、infinity-c4-ring共24入口通过。

seventh-tree-browser.test.cjs在1280/390/320px验证正式step抵达TREE10当场授予成就、普通成就卡片、68点预览/实际到账、保存与下一轮TREE5的18点（均含+3与B2），且渲染不写状态/无横向溢出。在线跨阶和离线读取已达TREE10两场原生Worker与浏览器主线程正式OfflineHeadless宿主完整状态对照通过，只排除lastUpdateAt/boundaryAt宿主时间戳。初次Node与Edge跨版本引擎对照时，其他大数superProgress尾数差3.5e-18，因此改为同浏览器引擎严格比较，无放宽数值断言或删除玩法字段。

ui-state-boundary通过；修改运行/测试4文件语法、78脚本manifest、67脚本Worker新鲜度通过。开发build dev-0.1.7.12-20261019-seventh-tree，发布版未动。证据../WIS-项目资源/seventh-tree-20261019/VERIFICATION.json。临时文件仅E盘，完成后清理；未跑全部历史套件、玩家档或实体设备。

## 修真道最高境界统计验收（2026-10-19）

xiuzhen-statistics.test.cjs新增8项，旧实现8失败、新实现全通过：手动/自动突破记录、四类转生保留历史且不恢复当前进度、旧档手动历史补齐/只读、失败突破原子性；无限转生后highestRealm仍0、星系软上限资格不误恢复。xiuzhen-statistics-browser.test.cjs在真实trainingUp统计解锁条件下于1280/390/320px各17场景通过（11境界及空白、炼气、重置、新一轮、封印、武道），切换总统计/当前转生统计验证文本、只读与布局。

infinity-reset/infinity-c4-ring与新增测试共18入口通过；fourth-step-immortal内部10项通过。fourth-step-browser-worker三宽度购买界面及仙道/武道×在线/离线×普通/超高值8场Worker全状态/存档对照通过。ui-state-boundary、修改脚本语法、78脚本manifest及67 Worker包新鲜度通过。仅开发版改动；简要证据../WIS-项目资源/realm-statistics-20261019/VERIFICATION.json。无玩家档/实体设备/完整历史套件验证。

## D8/D9构造点保留验收（2026-10-18）

tree-construction-retention.test.cjs新增7项：D8/D9实际产出跨边界、D9购买扣费/强化等级/保存后继续消费、离线积累后重载并在线完成、手动下一阶、已完成阶位续接、未买D8原清零和跨边界剩余时间只计一次。旧实现6失败（示例10040.5清至0），新实现全通过；与tree-super-toggle、d8-d10-tree、d11-super、tree-late-rules、infinity-reset共20入口通过。

扩展tree-super-toggle-browser：D8/D9×1280/390/320px正式step后库存和DOM/Save保留，原D10关闭保存手动继续三宽度通过；Worker测试扩至D8/D9/D10/D11×online/offline共8场，与本地状态对照并验证离线存档返回在线不清库存。仍仅排除宿主lastUpdateAt/boundaryAt时间戳。ui-state-boundary、修改脚本语法、78脚本manifest、67 Worker成员新鲜度通过。仅开发版修改，发布仍0.1.7.12旧构建。E盘临时浏览器目录清理，简要记录保留；无玩家档/实体手机/完整历史套件验证。

## 0.1.7.12发布同步验收（2026-10-16）

WIS_GAME_ROOT明确指向发布版。tree-super-toggle、rock-effective-level、d8-d10-tree、d11-super、infinity-state/reset六文件20入口通过；infinity-state/reset补充可选发布路径并单独重跑，避免原硬编码开发目录造成误验。tree-super-toggle-browser亦补充可选发布根目录，用发布UI及发布Worker验证三宽度真实关闭/保存/继续及四场online/offline×D11 Worker完整玩法/RNG/债务对照（仅排除宿主时间戳），全部通过。

release-0170历史测试名更新版本断言为0.1.7.12：四宽度导航/只读/无调试/Alt+S不改变×1、两份旧档重导出和实际file启动通过。ui-polish与resource-panel-layout补充WIS_GAME_ROOT，分别三宽度和十宽度通过；multiverse-scale三宽度24场景、fractal-resource三宽度通过。两侧各84运行JS语法、78脚本manifest、67 Worker成员与88项release转换一致性通过。80个非版本/非生成JS与同步前哈希相同。保留简短VERIFICATION.json，临时浏览器目录清理；未执行完整历史套件、实体手机、长期性能。

## 资源字号优先验收（2026-10-16）

resource-panel-layout-browser在原十宽度检查基础上新增901px五张主资源同排、主字号14–16px的约束，旧CSS复现失败，新CSS全部通过；其他宽度保持库存完整、无卡片/页面溢出及折叠正常。multiverse-scale-browser三宽度24场景通过。78脚本manifest/67脚本Worker新鲜度通过，脚本build未变；仅CSS独立缓存刷新。已核验桌面/手机截图，临时产物清理。验证摘要位于../WIS-项目资源/resource-fonts-20261016/VERIFICATION.json；发布版摘要未变。

## 宇宙数量展示验收（2026-10-16）

扩展multiverse-scale-browser.test.cjs：原实现先因缺少无限页数量区域失败，新实现于1280/390/320px各8场景通过；包括第三步N、多元零库存/高层ee库存、两位小数、库存变化实时刷新、顶栏N隐藏、封印/其他体系/重置及UI只读。resource-panel-layout-browser十宽度、ui-state-boundary、78脚本manifest与67脚本Worker新鲜度通过；app/infinity脚本语法通过，人工核验390px新数量区域。版本仍0.1.7.11，发布版摘要未变。临时浏览器目录/截图已清理；未测试实体设备、完整历史套件及长期性能。

## 顶部资源栏排版验收（2026-10-16）

新增tests/resource-panel-layout-browser.test.cjs，使用生产HTML/CSS及真实UI收起按钮，填入玩家截图中的十项资源文本（只检验布局，不替代公式验证）。旧样式在901/1057/1151/1152/1280px复现数字逐字断行/收益越卡片，手机复现N与N²宽度不一致；修复后320/390/430/600/800/901/1057/1151/1152/1280px全部通过。断言每个库存单行、文字矩形留在卡片内、页面无横向溢出、N/N²通栏一致、收起恢复正常及持久状态不变。

另通过multiverse-scale-browser三宽度×8实际游戏场景、ui-polish-20261015-browser三宽度、ui-state-boundary只读/导航/正式动作边界；78脚本manifest和67脚本Worker新鲜度通过。人工检查桌面/手机截图，临时截图与浏览器目录验收后清理；简要报告在../WIS-项目资源/resource-layout-20261016/VERIFICATION.json。脚本build不变，CSS独立缓存更新。发布版文件摘要与上一任务一致。未跑完整历史套件/实体手机/长期性能。

## D10自动开关验收（2026-10-16）

新增tree-super-toggle.test.cjs共9项：旧代码先复现5项失败，另发现起点已满余额仍产新进度的1项失败，修复后全部通过。覆盖有/无D11、关闭后只完成一目标、保持未完成目标、超额余额/Save/手动再次进入、重新开启、原连续多阶、离线后首次在线、最大TREE及已积满立即停止。d8-d10-tree、d11-super的连续推进夹具现明确打开开关；与d7-automation、tree-late-rules、frozen-offline-big-numbers、infinity-state/reset共8文件16测试入口通过。

tree-super-toggle-browser在1280/390/320宽度通过真实设置按钮关闭、正式0.1秒结算停下、余额提示、保存重载和手动继续；4场实际Web Worker（online/offline×D11有无）与本地玩法、RNG及债务完全一致，仅排除宿主检查点lastUpdateAt及boundaryAt时间戳，并验证Worker存档重读余额及关闭偏好。旧d8-d10-worker、d11-worker各2场通过，ui-state-boundary只读通过。

独立审查探针验证有/无D11、余额1/3.38/1e100/ee10候选准备不改源状态，Save保留余额；审查提出的已积满起点分支差异已补测试修复。84运行JS语法、78脚本manifest和67 Worker成员新鲜度通过。发布版未变，SHA256仍220248288f043232aa208a6b1c92fba96521cc513ef1b994830776e40972e754。未跑全部历史套件、实体手机或长期性能；旧构建逆向读新explicit余额不兼容，见AGENT_CONTEXT。临时文件只在E盘并清理。

## 开发界面13项修正验收（2026-10-15）

- ui-polish-20261015-browser：1280/390/320宽度通过；探寻/灰收益DOM移除、文案和字号、普通全购分栏隐藏/恢复、仙道能力单购/重复上限/即时购买隐藏、偏好旧档/Save/重置、无限树2/3节点和筛选后均分、只读/无溢出。
- fractal-resource-browser：三宽度各5场，未购/真G1/秒内采样/全部符号高值/额外倍率，库存及正式总速率一致；30Y/s采样正式0.1秒到账3Y，未改正式公式。
- rock-effective-level：7项通过，先在旧实现复现6失败；48种等级加成组合、整数和大值、购买上限/费用、战力/碎星/天晶实际进度/ETA、候选只读及Save原等级。frozen-offline-contract 13项、martial-gang-dan 7项、online-source-scope、treasure-power-batch均通过。
- exploration-preview-refresh更新为移除行动预览后的合同：真实高值档行动页零预览求值，小天劫预览继续生效且只读。helpers/preview-browser兼容有/无行动预览的版本；exploration-cooperative-browser完整正式状态/RNG/账本一致，候选隔离、让出与取消均通过。cooperative-preview/ui、hold-scheduler通过。
- batch-a-interfaces已更新宝物每次件数尾注预期；与rock、infinity-state/reset、三项exploration Node测试共同13个入口全通过。ui-state-boundary、upgrade-filters-browser三宽度、third-step-browser通过。infinity-expansion-worker四场Worker/本地完整状态、RNG、累计、债务与Save重读一致。
- 84运行JS语法、78脚本manifest、67 Worker成员新鲜度通过。目视查看1280/390强化树截图，D7/D11三等宽与上下整行边缘一致。独立代码审查记录在简要报告中。发布版聚合SHA256保持220248288f043232aa208a6b1c92fba96521cc513ef1b994830776e40972e754。

所有临时文件置E盘并在验收后清理。版本不变，开发build刷新ui-polish。未运行完整历史测试/实体手机/长期性能，未同步发布版/commit/push/线上部署。

## 0.1.7.11发布同步（2026-10-15）

显式WIS_GAME_ROOT指向发布版：g-requirement-order五组（含独立公式、在线/冻结逐阶参考、百万阶和signed边界）及infinity-state/reset/expansion三套件通过，共8个Node测试入口；infinity-expansion-worker四场完整玩法状态/RNG/债务/保存重读与本地一致。

release-0170检查更新为0.1.7.11：78脚本语法、75共享页面脚本字节一致，320/390/430/1280宽度导航只读、无调试DOM/UI测试入口、Alt+S无法改变×1、性能诊断关闭；两份旧档重导出和实际file://启动通过。upgrade-filters-browser、infinity-expansion-browser、multiverse-scale-browser均显式指向发布版，各1280/390/320宽度通过，验证过滤保存/转生、购买与G需求、多元量级和回退、只读/无溢出。

两侧各84运行JS语法、78脚本manifest、67 Worker成员与88项发布转换检查通过。开发js目录除版本配置/build/Worker外80文件与同步前SHA256一致；无额外数值或Save规则改动。所有临时数据在E盘并清理，保留简要VERIFICATION.json。未重跑全部历史测试/实体手机或长期性能；不宣称性能提升。仅本地发布同步，未commit/push/线上部署。

## G需求顺序验收（2026-10-15）

新g-requirement-order.test.cjs五组通过：48配置×12阶位独立公式、48配置在线/冻结逐阶参考、百万阶补偿求和参考及有界执行、单阶带符号不足/恰好支付及Save、30组128/129/2048/2049/4096阶累计需求±0.25/0边界。初次旧实现复现42≠9.9；发现旧单阶多项式改写与按序相减在舍入边界不同后，正式单阶改为直接R−G，不放宽支付比较。

最终六文件node --test通过10个入口（新五组，另五个文件入口）：g-requirement-order、infinity-expansion、true-graham-reward、tree-late-rules、frozen-offline-big-numbers（内部25场）、big-challenge-achievements。旧测试中原D6全局42底限及旧奖励顺序预期已按授权规则更新，保留高阶整数参考、百万阶与旧档保护。infinity-expansion-worker四场实际Worker与本地完整玩法状态/RNG/累计/债务/保存重读一致。真实Edge：infinity-expansion-browser三个宽度购买/保存/需求/无溢出，true-graham-reward-browser五场实际需求，upgrade-filters-browser三个宽度全部通过。

独立只读代码审查未发现剩余代数/顺序阻塞；高阶参考误差在有限精度量级，不声称任意大批与逐阶Decimal累加逐比特一致。长批百万阶正式测试约0.30秒（并行验收环境，仅有界执行证据，不作为稳定性能提升声明）。四个改动运行JS语法、78脚本manifest、67成员Worker新鲜度通过。发布版聚合SHA256仍c8ec22186170959afd93a5fb8bc9e5c933f658f6f14738f90e23b7f5cde5700d。未跑全部历史套件/实体手机/长期平衡。

## 强化过滤验收（2026-10-15）

新增tests/upgrade-filters-browser.test.cjs：1280/390/320宽度全部通过。覆盖两个独立按钮、默认显示全部、购买后即时隐藏、普通可重复强化达到上限才隐藏、无限树空行压缩/详情切换/全分支已购空态、显示全部恢复、Save往返、转生保留、旧档默认false、渲染只读和无横向溢出。初次失败为缺少按钮；实现后测试夹具从爆街修正到思维分割实际开放的爆城量级，全部通过。

ui-state-boundary真实DOM渲染/导航/预览只读通过；infinity-state、infinity-reset、infinity-expansion三个套件通过（包括D6公式与批算）。78脚本manifest、67 Worker脚本包新鲜度通过。发布版全部文件聚合SHA256保持c8ec22186170959afd93a5fb8bc9e5c933f658f6f14738f90e23b7f5cde5700d。只修改开发UI/偏好及构建，不改玩法公式、RNG、clock/debt或schema，不声称性能改善。未运行全部历史测试或实体手机测试，未同步发布、commit/push/线上部署。

## 多元量级显示验收（2026-10-14）

当前双侧build后缀为-multiverse-scale，版本0.1.7.10。新增tests/multiverse-scale-browser.test.cjs，使用WIS_GAME_ROOT可分别指向开发或发布；各1280/390/320宽度的8状态共48场景通过，覆盖量级优先级、N²标签/库存/可见性、下一量级隐藏、封印/切换/重置和渲染只读，无横向溢出。初次旧代码在N²标签断言失败；实现后修正测试格式化接口为Format.number，两侧全部通过。release-0170.test.cjs的78脚本语法、75共享脚本一致、四宽度无调试/导航、两份旧档重导出及file启动通过。manifest、Worker新鲜度与88项发布转换检查通过。仅显示及缓存/文档调整，数值、Save、RNG和clock/debt未改；未重跑完整历史套件或长期性能。

## 0.1.7.10 发布同步（2026-10-14）

开发/发布build为dev-0.1.7.10-20261014 / release-0.1.7.10-20261014。用户授权同步当前全部正式内容；Schema72/rule2/saveKey保持。

- 显式WIS_GAME_ROOT指向发布版：martial-gang-dan 7/7、changsheng-contract 14/14、martial-balance-contract 28/28、infinity-c4-ring 9/9、infinity-power-c5 6/6、fourth-step-immortal 10/10、immortal-four-abilities 15/15、finite-progress-accuracy 7/7，共96项领域用例通过（Node测试汇总73入口，另两个入口分别执行10、15个内部用例）。
- 发布版原生Worker：第四步/武道8场（含罡劲丹劲），圆环4场，共12场通过。第四步/武道完整游戏状态与本地一致，能力、点数/强化付款账本、Save、RNG、clock/debt按各场景验证。
- release-0170：78脚本语法、75共同页面脚本字节一致；320/390/430/1280宽度导航只读、39个无限节点、版本0.1.7.10、无调速/公式调试/UI测试入口、Alt+S固定×1、性能诊断默认关闭；两份旧档重导出、实际file://启动通过。
- 罡劲/丹劲、C4圆环、C5/踏天/道无涯/道源/长生诀分别在1280/390/320宽度完成实际按钮购买、保存、只读与无溢出。release-layout桌面、75%缩放、长屏及390/320布局与进度解锁通过。
- 两侧各84运行JS语法、78脚本manifest、67 Worker成员新鲜度，以及88项发布转换资源逐文件一致性通过。同步前后开发运行JS仅版本config、build-config和生成Worker变化，js目录中其余80文件哈希保持。

本轮仅版本和发布转换及相关测试/文档调整。未重跑全部历史套件、完整长期平衡或实体手机/长期性能测试，不宣称性能提升；此前历史夹具问题未扩修、不计通过。产物均在E盘，临时数据清理，保留简要验收。未commit/push/线上部署。

## 罡劲与丹劲验收（2026-10-14）

开发build dev-0.1.7.9-20261014-gang-dan。新martial-gang-dan 7/7、changsheng-contract 14/14、martial-balance-contract 28/28，共49/49；新功能测试先复现6项缺失失败后实现。覆盖购买门槛/准确扣费/单次购买、全局战力实际消费者×10、健身0/10/100/1000/大整数与候选只读、打岩折算排除、气体减速前投入倍率、长生诀单次放大及冻结、Save与低阶重置。无新能力的旧武道完整快照仍严格匹配。

frozen-offline-contract 13/13与online-source-scope通过。新增真实Edge界面1280/390/320宽度验证国术劲力分组、前置禁用、30/60魂购买、保存、只读与无溢出；健身100→400时显示×11→×21。既有fourth-step-browser-worker保留4场仙道保护，4场武道新增罡劲/丹劲：完整状态与本地相等，Save/RNG/clock/debt通过；K=2、健身100、起点气0时，在线0.4秒增加17.6气，冻结离线60秒增加2640气。高值已有气保持。

修改的JS/测试语法、78脚本manifest、67 Worker成员新鲜度通过，发布版91文件哈希未变。未运行全部历史测试、完整长期平衡或实体手机性能；未声称性能提升。主要修改martial-config/martial/ui-martial及开发build/生成物，Save格式、随机与时钟债务规则保持。开发调试保留，未commit/push/部署。验收摘要位于../WIS-项目资源/gang-dan-20261014/VERIFICATION.json。

## 圆环保留规则验收（2026-10-14）

开发build dev-0.1.7.9-20261014-ring-retention；仅本地开发版变更，发布版91文件SHA256保持。

- infinity-c4-ring 9项与infinity-power-c5 6项通过。更改断言后先复现5项清空问题；修正后15/15。覆盖入场保留点数、累计获得、C1–C5与实际付款账本，其他进度仍清空，查询/失败回滚、旧档、退出/重复入场、无额外点数、保留C1直接突破及洗点退款。
- infinity-reset/root-reset/challenges/lifecycle/reset-automation/c2-b6-c3共12个测试入口通过；普通无限转生、自动化、奖励与失败回滚保持。
- 真实Edge：1280/390/320宽度完成C4购买、确认取消/确认入场、保留835点与C4、保存、只读渲染、退出和无横向溢出。原生Worker在线/离线×完成/未完成4场通过，均从实际入场结果出发，检查点及保存后保留835点、C4与165点付款账本。
- 修改的运行脚本语法、78脚本manifest、67脚本Worker新鲜度通过；RNG、clock/debt和Save格式未改。没有重跑全部历史套件、实体手机或长期性能测试；不宣称性能变化。未commit/push/部署。

## 第四步与长生诀验收（2026-10-14）

开发build dev-0.1.7.9-20261014-fourth-step，游戏版本0.1.7.9、Schema72/rule2保持；发布版91文件哈希未变。

- 新领域测试：infinity-power-c5 6/6、fourth-step-immortal 10/10、changsheng-contract 14/14，均先复现缺功能的失败再实现。覆盖当前N门槛、基础加点再乘倍率、C5费用/洗点/圆环、突破与能力费用、五来源指数/惩罚与自动效率顺序、本源真实库存需求、N²在线/冻结/超大数、旧存档默认、历史自动买、长生诀清空/费用/种类/名额、衰减积分、失败原子性与重置。
- 核心 tools/test-settlement-engine 25/25；martial-balance-contract 28/28、infinity-c4-ring 8/8、third-step/settlement/gate/offline通过，后者包含真实高值旧档及600秒冻结。旧武道基准文件未重生成，先严格断言新增M资源及结算字段均为零，再仅排除这些新字段；第三步旧测试枚举明确限定realm7–10。
- 已有四仙道能力15/15、探寻6项、灭9组、finite-progress-accuracy 7/7、treasure-power-batch通过。既有绝对宝物进度修复保持。
- fourth-step-browser-worker：真实Edge在1280/390/320宽度完成C5购买、踏天突破、道无涯/道源购买、长生诀清内功及重修扣费；存档重载、只读渲染、无横向溢出通过。仙道/武道×在线/离线×普通/高值共8场原生Worker，完整状态与本地一致，Save、RNG、clock、债务清理通过；N=1000离线60秒增加60M，长生诀K=2起点气0离线60秒增加240气。
- 既有四仙道能力三宽度UI及4场原生Worker通过；ui-state-boundary只读/页面导航/旧缺字段/动作解锁通过。本轮合计12场原生Worker对照。
- 用户10月13日存档的保留副本导入：realm10、N=248196.55117740904、可用无限点1000；新M默认为0，正式成就检查获得无限之力，保存重导出有效，原存档未修改。
- 独立只读审查无阻止交付发现；额外240组长生诀分段积分探针通过。审查未独立重复完整浏览器/Worker或长期平衡验证。
- 84运行JS语法、78脚本manifest、67 Worker成员新鲜度通过；开发调试设置保留。新领域/UI/结算及文档为本次修改范围，未改变RNG/clock/debt格式或规则。

未进行完整长期通关平衡、实体手机及长期性能压力测试，不宣称仙武已全面均衡或性能已提高。未重跑全部历史套件；历史roam-spirit-world-preview的DOM替身、continuous-adaptive旧活跃断言问题仍见下文，不计本轮通过项。所有本轮文件在E盘，保留源码、必要测试与简要验收，临时输出和审查快照完成后清理。未commit/push/部署或同步发布版。

## 0.1.7.9 发布同步（2026-10-13）

开发/发布 build 为 dev-0.1.7.9-20261013 / release-0.1.7.9-20261013。当前正式内容全部同步，包含本次宝物有限进度修复；Schema72/rule2/saveKey保持。

- 显式 WIS_GAME_ROOT 指向发布版：finite-progress-accuracy 7/7、treasure-finite-recovery 2/2、immortal-four-abilities 15/15、martial-balance-contract 28/28、infinity-c4-ring 8/8，共60项通过。
- 持续在线6000帧/600游戏秒通过，八灵尺库存6375，未消费绝对进度不倒退；合成旧暂停档31.65秒重试完成。本轮持续用例约63.18秒，仅记录回归耗时，不宣称性能改善。
- 原生Worker：旧暂停恢复1场、四仙道能力/武道/C4各4场，共13场通过。旧暂停发布Worker完整游戏状态与本地相等，31.65秒清完、库存691、存档有效；本轮10次检查点，次数随调度变化。
- release-0170：78脚本语法、75共同页面脚本字节一致；320/390/430/1280宽度、版本0.1.7.9、无调速/公式调试/UI测试入口、Alt+S固定×1、性能诊断默认关闭、导航只读、38无限节点、两份旧档重导出、实际file://启动均通过。
- release-layout桌面、75%缩放、长屏及390/320宽度通过；四仙道能力在1280/390/320宽度购买/扣费/保存/只读/无溢出通过。
- 两侧各84运行JS语法、78脚本manifest及67脚本Worker新鲜度、88项发布转换资源逐文件检查通过。有限进度修复开发/发布字节相同。开发运行JS仅config、build-config、生成Worker变化，其余81个文件哈希保持。

只做版本与本地发布转换，没有新增玩法、RNG、clock/debt或存档格式变化；未commit/push/线上部署。未重跑全历史套件或实体手机/长期性能测试；下文既有两项旧夹具失败未扩修、不计通过。临时输出均在E盘并清理，保留简要VERIFICATION.json。

## 宝物有限进度修复（2026-10-13）

开发 build dev-0.1.7.8-20261013-finite-progress。仅修复精度错误，版本0.1.7.8、Schema72/rule2、saveKey、玩法数值、RNG与clock/debt合同保持；发布版91文件SHA256未变。

- 新增 finite-progress-accuracy：7/7。旧实现先复现大需求正收入变负、亚精度欠额提前发奖两项失败；修复后通过。覆盖2172.377635032258+6、小额连续累加、零收入、直接入库100轮后绝对进度仍为100、自然奖励支付和负收入拒绝。
- 新增 treasure-finite-recovery：2/2。使用旧0.1.7.8代码实际生成的合成暂停档，旧实现两个用例均复现负余额错误。新实现6000个正式0.1秒在线帧通过，每1000帧存档重载；八灵尺375→6375，本源10及RNG保持，未消费进度不倒退。另一个用例重试31秒在线+0.65秒离线全部完成，八灵尺691，clock准确、保存无剩余恢复任务。持续用例先通过；随后仅修正完成存档省略offlineRecovery字段的测试断言并重跑第二例通过，未更改生产实现。
- 新增 treasure-finite-worker：原生Edge Worker从同一旧暂停档恢复31.65秒，11次检查点，库存691，完整游戏状态与本地一致，RNG/clock/存档通过。不是原受影响玩家存档。
- 核心 tools/test-settlement-engine：25/25。仙道 immortal-four-abilities 15/15、immortal-four-mie 9组、武道 martial-balance-contract 28/28，以及 treasure-power-batch、treasure-ledger-capacity基础7项、opportunistic-progress、third-step-offline通过；后者包含既有真实高值旧档导入及10秒离线。未提供的可选schema59玩家档容量回归没有运行，不计通过。
- 真实Edge：四仙道能力1280/390/320宽度购买/保存/只读验证通过，ui-state-boundary通过；四仙道能力、C4、武道各4组原生Worker在线/离线保护通过。以上另加本轮旧暂停Worker用例共13组。
- 独立只读审查无发现；额外360个普通、极小、大科学数及ee/eee内存探针未出现负进度、未消费进度倒退或错误跨越需求。有限carry固有精度与既有高层批算策略未扩修。
- 84运行JS和3个新增测试语法、78脚本manifest及67脚本Worker新鲜度检查通过。Worker包重新生成；已保留开发调试设置，未触碰发布版。

6000帧本机测试约60.3秒、最大单帧88.2ms，仅是该回归负载观察，不代表稳定性能改善或实体手机表现。没有全历史套件/长期通关/实体手机测试。下文既有roam-spirit-world-preview的DOM替身、continuous-adaptive旧活跃断言失败未扩修、未计通过。所有本轮产物在E盘；临时输出清理，保留测试、合成夹具与简要VERIFICATION.json。未commit/push/部署。

## 0.1.7.8 发布同步（2026-10-12）

开发/发布build为 dev-0.1.7.8-20261012 / release-0.1.7.8-20261012。用户授权同步全部当前内容；此次没有新增玩法或数值改动。

- 显式 WIS_GAME_ROOT 指向发布版：immortal-four-abilities 15/15、martial-balance-contract 28/28、infinity-c4-ring 8/8通过。C4领域加载器新增可选发布路径，默认仍为开发目录。
- 发布版原生Worker：四仙道能力、武道平衡、C4圆环各4场（共12场）通过，覆盖在线/离线和高值或挑战完成边界，完整状态、检查点及存档通过。生的离线60秒仍按起点5本源增加300圣树，本段新增本源不反哺。
- release-0170通过：78发布脚本语法、75共同脚本字节一致；320/390/430/1280宽度导航只读、版本0.1.7.8、38个无限强化节点、调速/公式/UI测试入口移除、Alt+S固定×1、性能诊断默认关闭；两份旧档重导出与实际file://启动通过。
- release-layout通过：桌面、75%缩放、长屏、390/320宽度侧栏、进度解锁与无横向溢出；四仙道能力在1280/390/320宽度购买、价格、旧进度即时结算、存档与只读渲染通过。
- 开发及发布manifest（78脚本）、Worker（67脚本）、88项发布转换资源逐文件检查通过；两端各84个运行JS语法通过。除config、build-config、生成Worker外，开发运行JS与同步前哈希一致。Schema72/rule2/saveKey保持。
- 未跑全历史套件、实体手机或长期性能；此前两项旧夹具失败见下文，本轮未修复或计为通过。未commit/push/部署线上。临时输出全在E盘并清理，保留简要VERIFICATION.json。

## 四仙道能力验收（2026-10-12）

开发build dev-0.1.7.7-20261012-immortal-four；版本0.1.7.7、Schema72/rule2、saveKey保持，发布版91个文件SHA256未变。需求与价格已由用户确认。

- `immortal-four-abilities.cjs`：15项通过。境界/扣费/重复购买、存档、掌本源倍率、12种生库存过滤、小数秒与存档余量、封印与资格冻结、倍率隔离、正式在线下一帧反馈、冻结离线、转生、大数与非法余量、全事务回滚；自动购买灭与同帧自然/生奖励一致。
- `immortal-four-exploration.cjs`：6项通过。量与法力同步×100，手动不变，正式提交、预览只读、未纵横/非仙道/封印、低境界负载与e2000候选隔离。
- `immortal-four-mie.cjs`：9组通过。13种需求、独立指数/幂次求和与逆解、绝对旧进度即时结算、资格/pending/幂等、来源封顶、大数FastForward缓存隔离、直接入库旧尾数及有限缓存失败回滚。
- `immortal-four-presentation.test.cjs`：直接库存来源、自然预计时间和暂停区分、排除本源/封印及只读通过。
- `immortal-four-browser-worker.test.cjs`：真实Edge在1280/390/320宽度完成四按钮购买、准确扣费、旧本源90进度即时换3件、存档重载与无横向溢出；原生Worker在线/离线×普通/高值4场，完整游戏状态与本地一致，能力、宝物、余量、RNG与clock保存通过。离线60秒起点5本源时，玄天圣树均增加300，即使本源已增至21/390也不反哺本段。存档余量比较按字段而非对象键顺序。
- 核心 `tools/test-settlement-engine.cjs` 25/25通过。原第三步/结算/离线/恢复、treasure-power-batch、treasure-ledger-capacity、C4领域及immortal-milestones通过；third-step-offline包含原真实高值旧档迁移与10秒结算。
- `martial-balance-contract.test.cjs` 28/28通过；旧冻结非武道期望不重生成，仅先断言新增shengProgress为空再排除这个空字段，其他完整状态包括RNG/clock继续严格比较。`ui-state-boundary`、`origin-treasure-browser`、武道和C4原生Worker保护通过。
- 独立只读审查：1170组灭后自然来源/封顶逐事件参考一致（余量相对容差1e-9）；自动灭结算后注入错误，前台与恢复在线均完整回滚。
- 84个运行JS语法、78脚本manifest及67脚本Worker生成检查通过。

额外已知失败（不计通过）：`roam-spirit-world-preview.test.cjs` 的DOM替身缺 `classList.contains`；`continuous-adaptive.test.cjs` 前6个数学场景通过，随后旧“六资源均活跃”断言失败。测试进程关闭本次掌/缘倍率后仍复现；未更改这些旧夹具或扩修无关逻辑。

新测试先在缺能力/缺显示或具体边界下失败，再修复通过。测试与临时数据全在E盘，结束清理临时日志/副本，保留测试源和简要验收。没有完整长期通关策略、实体手机或长期性能压力测试；不宣称仙武已全面均衡。未提交、推送或部署，发布版未触碰。

## C4 圆环之理（2026-10-12）

## 武道平衡调整验收（2026-10-12）

开发 build dev-0.1.7.7-20261012-martial-balance。在既有E盘隔离版先验证再应用开发，保留C4圆环之理；发布版91文件哈希未变。版本0.1.7.7、Schema72/rule2、正式saveKey及RNG/clock/debt保持。

最终开发验证：核心25/25；武道新math/contract和已有domain/heart-evaluation/increment-rounding合计96/96；C4领域8/8。真实Edge 1280/390宽度的只读渲染、公式预览、Save、布局通过；武道和圆环各4组原生Worker在线/离线及普通/高值场景通过。84个JS语法、78脚本manifest、67脚本Worker及实际file启动通过。正式页面不含测试存档标识。

新独立合同使用tests/fixtures/martial-balance-nonmartial.json，冻结推广前C4 build的普通/仙道online2秒与offline60秒完整状态，不在推广后与自己比较。旧大数场景和2e-11精度阈值保留；因新费用不能表示的旧预算明确验证不支付，足额预算仍验证实际增长与Save。

节奏：先实际准备魂5/12后，心30/40/120的受控兑换总投入与旧版相同；魂0路线需2.18/2.94/8.38倍。既有10月3日玩家快照30秒同策略在线，新增气/体为旧版9.14%/30.07%，已有库存不扣。本机双兑换均值2.58ms、最大5.15ms，正式帧未观察到明显回退；高值preview比旧版更贵，不宣称性能改善。完整仙武最优通关用时、长期能力策略与实体手机未验证，不能将投入相同等同用时相同。

已复现的既有范围：Save规范化会调整部分统计和空尾数表示（原开发同样发生），此次未扩修；Worker/local完整状态相等，改变的武道保存域及RNG/clock另验证。正常preview只读，旧cost Decimal对象别名合同未改。

详细数值与有效基准结果：../WIS-项目资源/martial-balance-20261012/RESULTS.md；完整简要验收VERIFICATION.json。临时日志、浏览器输出与推广备份清理，仅保留必要测试与报告；未commit/push/部署。


开发build dev-0.1.7.7-20261012-c4-ring；版本0.1.7.7、Schema72/rule2、78页面脚本/67 Worker脚本保持；发布版未修改。

- infinity-c4-ring：先在缺少C4和旧全保留规则下失败，实现后8/8通过。覆盖价格/前置/扣费、成就以外进度清空、设置/RNG保留、旧档默认与非法状态拒绝、跨普通挑战/无限转生/强化重置/存档持续、当前realm6/7边界、正式C1支付及单体突破、成就仅保留双体系挑战与炼气奖励、退出不返还进度、进入安装失败回滚。独立审查发现退出保存失败丢失挑战状态，补测试复现后修复并通过。
- infinity-c4-ring-browser：真实Edge在1280/390/320宽度验证C4购买、确认取消、进入后的状态/存档重载显示、普通挑战仍可进入、只读渲染、退出及无横向溢出；时钟受控，非实体手机。
- infinity-c4-ring-worker：原生Worker在线/离线各覆盖活动中和完成目标两场景，检查点、奖励、存档恢复通过。
- 核心test-settlement-engine 25/25通过；infinity-reset/challenges/effects/expansion/c2-b6-c3/root-reset、infinite-challenge、immortal-milestones、martial-development通过。与旧一证永证规则冲突的领域/浏览器断言同步新规则；martial-development旧Schema71断言更新到既有Schema72，未改存档版本。
- immortal-milestones-browser、infinite-challenge-browser、ui-state-boundary通过。manifest/Worker及生产脚本语法检查通过；发布版全文件聚合哈希保持。
- 数值变化仅为本次玩法和成就效果；未改RNG序列、在线/离线收益计算或clock/debt合同。所有临时输出位于E盘并清理，保留回归源代码和本记录。未跑全历史测试、实体手机或长时性能基准；未提交、推送或发布。

## 0.1.7.7 发布同步（2026-10-11）

开发/发布build为dev-0.1.7.7-20261011 / release-0.1.7.7-20261011，Schema72/rule2保持；同步全部当前正式运行内容，取消发布调速、Alt+S、公式详情调试及UI测试入口，正式速度固定×1。

- sync-release逐文件检查：88项运行/文档资源一致；两份manifest/Worker检查通过。
- release-0170：78发布脚本语法、75共同脚本字节一致；320/390/430/1280四宽度导航只读、版本、37个无限强化节点、调试禁用及Alt+S固定×1；两份旧档重导出和真实file启动通过。
- release-layout：桌面、75%缩放、长屏、390/320手机宽度的侧栏、进度显示与无横向溢出通过。
- 显式WIS_GAME_ROOT指向发布版，infinity-c2-b6-c3、d11-super、frozen-offline-big-numbers通过；infinity-c2-b6-c3-worker与d11-worker使用发布版脚本/Worker包，在线恢复和离线、检查点与存档恢复通过。测试加载器新增可选路径参数，默认仍验证开发版。
- 版本、发布转换和文档变更，无新增玩法或数值；RNG、clock/debt、Save规则保持。未测实体手机或全历史套件，未提交、推送或部署线上。所有本轮临时产物位于E盘并已清理。

## 已知测试失败与来源预览修复（2026-10-11）

开发build dev-0.1.7.6-20261011-preview-tests，版本0.1.7.6、Schema72/rule2保持；发布版未修改。

- 原googol-high-scale失败并非仅测试装配：SourcePreview漏了nieForce/universeCoefficient。现补齐中文名称、原始/最终收益和过程，复用Xiuzhen.rawRates/rates；不新增惩罚、不改产出。测试按现行规则区分受罚的仙力/元力与不受罚的涅力/N，并增加第三步非零产出、过程重放与只读断言。
- helpers/ui-app加载完整Martial UI，补齐宿主DOM创建、容器和武道挑战分组。manual-penalty-live-online现完整通过，包含此前未执行的补偿显示、显隐恢复、旧在线零碎时间、保存和正式逐帧状态/RNG对照。
- 共享夹具回归发现offline-running-ui仍监听已退休macro入口，现观察正式FixedSegment.createWork，保留先paint后工作、暂停/放弃不结算检查；treasure-eta-offline-summary按用户现行规则检查自动管理完成后不新增摘要、只确认一次，以及关闭自动管理后手动查看摘要。
- googol-high-scale、manual-penalty-live-online、source-display、source-process、offline-running-ui、treasure-eta-offline-summary、signed-ledger-recovery、infinity-c2-b6-c3通过。可选历史玩家档/历史对照未提供，不计入实测。
- 最终manifest/Worker检查及78生产脚本、4个改动测试文件语法通过；真实Edge ui-state-boundary通过6轮渲染、14次导航和预览只读检查。E盘本轮临时输出已清理。
- 本次仅来源显示、测试和构建标识调整；游戏数值、RNG、clock/debt与Save不变。未运行全部历史测试或长期性能基准。

## C2 / B6 / C3（2026-10-11）

开发build dev-0.1.7.6-20261011-infinity-c2-b6-c3；版本0.1.7.6、Schema72/rule2保持，发布版未修改。

- infinity-c2-b6-c3：价格/前置、默认关闭、自动仙道/武道及仙道选择奖励、重置强化停止选择、偏好保存和非法值拒绝、六种资源十数量级阶梯与高层有限性、独立分段积分对照及防停算、同档位/高层低收益、C3实际Y获取和离线冻结通过。
- infinity-c2-b6-c3-browser：真实Edge 1280/390/320宽度，三节点价格/前置、设置选择与保存、无横向溢出通过；受控时钟，非实体手机。
- infinity-c2-b6-c3-worker：原生Worker在线恢复/60秒离线，三节点与设置保留、Y倍率、检查点/存档往返通过。
- foreground-live-state、exploration-cooperative-work、infinity-reset、infinity-effects、frozen-offline-contract（13场景）、d11-super通过。旧manual-penalty-live-online的曲线、积分/独立求积和60秒前台部分通过，后续旧UI夹具缺少当前模块create而失败；旧googol-high-scale进入来源预览时缺少nieForce注册而失败。本轮未修改这两项历史夹具，不宣称其完整通过。
- manifest/Worker及78生产脚本、新增测试语法通过。保留既有RNG、clock/debt、失败原子性和存档格式；本轮玩法数值变化仅为用户确认的新强化。没有全历史套件、实体手机或长期性能基准。

## D11 超构造推进（2026-10-11）

开发build dev-0.1.7.6-20261011-d11-super；版本0.1.7.6，Schema72/rule2和78/67脚本数不变，发布版未修改。

- d11-super先在缺少D11节点时失败，实现后通过：49点/D10前置、强化4锁定/解锁、前五级递增费用与每级1.2倍、自动购买、时间积分、TREE倍率、与独立逐阶参考比较、整段/分段一致、离线冻结倍率并累计时间、旧进度不重复加成、自动进入阈值与显示一致、第四强化支付失败整帧回滚、旧档补零/非法计时拒绝/转生重置、极端倍率到安全整数上限、正式离线和返回在线。
- d11-browser：真实Edge 1280/390/320三宽度，强化4显示资格、鼠标长按/松手停止、时间/倍率来源、离线超额进度、D11价格/前置和无横向溢出通过。受控时钟，未验实体手机。
- d11-worker：原生Worker在线恢复/48000秒离线，第四强化自动购买/离线不购买、动态升阶/离线不升阶、计时、检查点及存档恢复通过。
- 相关回归：d7-automation、d8-d10-tree、frozen-offline-big-numbers、tree-late-rules、infinity-reset/effects、frozen-offline-contract（13场景）、online-partial-cadence（23场景，注入失败日志属预期）通过。
- ui-state-boundary（6轮渲染、14次导航）及D7浏览器三宽度回归通过；本轮E盘临时目录已清理。
- manifest/Worker检查、78生产脚本及三个新测试语法通过。沿用原RNG、clock/debt和事务边界；未跑全历史套件或长期性能基准。

## D8–D10 超构造扩展（2026-10-11）

开发build dev-0.1.7.6-20261011-super-construction；版本0.1.7.6，Schema72/rule2，发布版未修改。

- d8-d10-tree：价格/前置、D8普通序列不推进、D9手动/自动支付及倍率保持、离线超额进度不升阶、分段冻结一致、在线跨阶余量、eee10倍率的有界升阶、最大安全阶位与保存恢复、旧无D10完成流程、正式离线→在线通过。旧frozen-offline-big-numbers的TREE完成断言按用户新规则改为只累计进度，其余合同回归通过。
- d8-d10-browser：真实Edge 1280/390/320宽度的D8/D9显示资格、超构造内鼠标长按/松手停止、离线超额进度显示、三节点价格/前置、无横向溢出通过。时钟受控，未验实体手机。
- d8-d10-worker：原生Worker在线恢复和48000秒离线，确认检查点、保存重载、D9自动升级/离线不购买、D10在线升阶/离线不升阶通过。
- D7领域、TREE后期/整合、无限扩展和冻结大数回归通过；冻结合同13场景、在线partial-cadence 23场景（注入失败暂停属预期）、D7浏览器三宽度及UI只读边界回归通过；manifest/Worker和78生产脚本语法检查通过。E盘临时目录已清理。保留既有RNG、clock/debt和失败原子性路径；没有长期性能基准，不宣称全历史测试已跑。

## D7 自动化与树构造长按（2026-10-11）

build dev-0.1.7.6-20261011-d7-automation；仅开发版0.1.7.6，Schema72/rule2不变。

- d7-automation：新增节点缺失时先失败；修改后价格/前置、默认开关、真实扣费、倍率临界、设置保存/重置、非法倍率拒绝、正式前台与恢复在线帧、收益先入账再购买、离线不购买/进入、付款故障整帧回滚通过。超构造在线/离线不产点得到确认，规则不改。
- d7-automation-browser：修改前长按仅一级，修改后真实Edge 1280/390/320三宽度，节点/分枝重复、标签门槛停止、松手/触屏取消、键盘单次、隐藏页面停止、D7价格/前置、自动化管理开关与科学计数法倍率保存、非法输入不改状态、无横向溢出通过。时钟受控以隔离UI测试，未验收实体手机。
- d7-worker：原生Edge Worker对含三个D7和1e300倍率的在线恢复/离线任务，分别验证自动购买发生/不发生、确认检查点和保存恢复，全部通过。
- 相关回归：infinity-reset/effects/expansion、tree-late-rules、tree-v1-integration、frozen-offline-big-numbers、foreground-live-state、online-partial-cadence、frozen-offline-contract、ui-state-boundary通过；partial-cadence的注入失败暂停日志属预期。
- manifest/Worker检查与78生产脚本语法通过；所有临时文件在E盘并清理。未跑全历史套件/长期性能基准，未修改发布版。

## 天材地宝批量统一与在线停算修复（2026-10-10）

开发build：dev-0.1.7.6-20261010-natural-batch；版本0.1.7.6、Schema72/rule2不变。原WIS-存档-2026-10-10T00-13-50-132Z.json在修改前首个在线帧稳定报“升级上界无法确认”；修改后通过natural-treasure-shared-batch：首帧、17.294秒在线债务、两种执行模式的门槛/分段、超大批次、上限及余量、保存往返、失败原子性、等比例指数型宝物对照，以及投影相等但精确值不等的顺序回归。

真实file Edge通过natural-player-online-browser：公开导入原档，正常主循环结清原17.294秒（未清零或改存档），再在线15秒加0.006秒对齐，保存重载无遗留债务；原生Worker继续60秒完成，无页面错误，原文件字节不变。测试固定墙钟以分开验证旧债务与新增时间，主循环和Worker仍用正式实现。

相关回归通过：natural-finite-fast、opportunistic-progress、treasure-power-batch、treasure-ledger-capacity、finite-economy、frozen-offline-treasure、online-partial-cadence（23场景）、frozen-offline-contract（13场景）、exploration-cooperative-work、signed-ledger-recovery。后两项可选的历史玩家档测试未提供，不计入实测；当前玩家原档由新增测试单独覆盖。

同类审计：旧ExplorationProgress.logValue主项和升级反推精度选择有两处近似首项假设，正式反推路径已退出；诊断logValue改为精确比较选择主项。SignedLedger正式compare/sign有精确/区间回退，未把投影相等当真实相等；资源/体系自动购买排序只处理已表示费用且支付另行校验；宝物高批次按显式近似规则处理完整高层净额，没有复现相同停算。此结论是本次调用链审计范围，非全项目不存在任何精度问题的保证。

manifest/Worker与生产脚本语法检查通过，发布版哈希不变。新增回归代码保留，E盘临时输出已清理；未运行全历史测试或实体手机，未同步发布、提交、推送。

## 开发版旧离线冗余清理（2026-10-08）

build：dev-0.1.7.6-20261008-offline-cleanup；版本0.1.7.6、Schema72/rule2保持。本轮仅必要测试，不运行核心25项全套或长时性能扫描。

通过：manifest/Worker生成物检查、78个生产脚本及6个关联文件语法；frozen-offline-contract（13项）、frozen-offline-recovery（7项）、frozen-offline-ordering（2项）、compiled-recovery、offline-worker-retry-span、offline-worker-engine。独立静态复审无阻塞问题。

offline-worker-retry-span已改为检查rule2：初始及两次重试不再传无效缩段选项，真实headless以一个冻结段结清600秒且不调用旧planner。offline-worker-retry-accuracy仅比较旧30/3秒参数，已删除；下方对它的记录为历史验收。诊断load/harness单次smoke确认四个退出生产装配的模块仍能显式加载，预算往返、simulation构建及宝物签名正常。

真实Edge仅运行offline-worker-browser.cjs --smoke：file新档600秒约81ms；HTTP首Worker强制卡死后约5.09秒自动重启并完成（2个Worker），期间UI脉冲255次、最大间隔36.3ms；两项均无遗留/已保存债务，clock=600。此为本机冒烟，不作普遍性能保证；未重跑高值长时、实体手机和全历史套件。

所有输出在E盘，临时浏览器目录和原始日志已清理，简要证据见 ../WIS-项目资源/cleanup-old-offline-20261008/REPORT.txt。发布版91个文件哈希不变；未同步发布、提交或推送。

## 发布版0.1.7.6同步验收（2026-10-08）

已同步当前开发真源，发布build为release-0.1.7.6-20261008，Schema72/rule2。sync-release逐文件、manifest、Worker检查通过；82脚本语法与79共同脚本字节一致。release-0170（历史文件名，现校验0.1.7.6/Schema72）、release-layout通过：调速/Alt+S/公式调试/UI测试入口移除，速度×1，320/390/430/1280宽度、缩放/高窗口、旧档导入导出及真实file启动正常。

WIS_GAME_ROOT指向发布版，challenge-system-realms-browser桌面/手机、frozen-offline-contract的13项通过。frozen-offline-browser使用原08:07玩家档，验证592.49秒遗留任务、TREE武道1e500的24小时和1e1000的7天：native Worker与独立本地结算全状态一致，冻结收益及宝物奖励正确；三组各继续在线15秒并保存重载，无遗留债务，原档哈希不变。所有临时输出在E盘并已清理；未验收实体手机或任意未来公式。本轮仅本地同步，未推送或部署。

## 挑战体系与突破需求（2026-10-08）

新增 tests/challenge-system-realms-browser.test.cjs，真实Edge/生产UI在1280与390宽度分别通过44项挑战资格检查、两处突破不足/精确支付边界、跨体系直接进入无副作用、普通挑战保留、完成过滤、旧档退出和只读渲染；同时核对界面价格。首次运行重现武道可解锁化凡的问题，修改后通过。另通过 graham-xiuzhen-challenge、immortal-milestones、frozen-offline-contract（13项）。manifest/Worker生成物与82脚本语法检查通过；发布版文件哈希保持。未验收实体手机；仅开发版调整，版本0.1.7.6、Schema72/rule2保持。

## 开发版0.1.7.6 固定离线收益（2026-10-08）

本轮最终通过：核心25/25、扩展在线/存档10/10、3组固定离线真实Edge场景、Worker启动卡死重试、暂停重载、交互与限时挑战Worker对照；82脚本语法和生成物检查通过。发布版90文件哈希不变。简要证据在 ../WIS-项目资源/frozen-offline-20261008/REPORT.txt。

Schema72 / settlement rule2。此版本按用户要求改变离线收益规则，不能继续将旧0.1秒自动化回放结果作为离线数值相等参考。在线仍以正式Loop/0.1秒为准确性参考。

常用验收：node tools/test-settlement-engine.cjs；完整浏览器扩展加 --browser。新门禁包含 frozen-offline-contract / treasure / big-numbers / recovery / ordering；--browser也包含frozen-offline-browser。TEMP/TMP/FIXED_RESULTS必须指向E盘，WIS_PLAYWRIGHT指向已有Playwright，WIS_PLAYER_SAVE可指定原08:07玩家档。缺真实玩家档时必须明确少了该验证，不可伪造输入。

新合同覆盖：0.05秒/60秒/24小时/7天只采样一次离线来源，完成后另作一次在线速率刷新；禁止旧planner与微步fallback；收益等起点rate×time，正常批量宝物但不反哺本段；无自动购买/突破/武道转换；G/TREE冻结进度及signed余量；5秒快速挑战的期限内/期限后收益；FIFO在线边界、暂停保存恢复不重复发奖、规则1迁移、未来规则拒绝与写盘失败原子回滚。

保护回归包含 online-partial-cadence（正式Loop的23场景）、online-segments、foreground-live-state、save-conflict、third-step-recovery、infinity-expansion、offline-return-backlog、budget-continuation、compiled-recovery、offline-segment-end。旧planner-budget/compiled-recovery/segment-end中的生产离线预期已按rule2更新，保留旧直接接口和故障保护检查。

真实file页面测试使用native Worker，并与同Edge独立页面的生产OfflineHeadless完整游戏状态比较（跨Node/Edge的超越函数末位不能当作一致性参考）；原592.49秒债务、无挑战TREE武道1e500的24h与1e1000的7d均验证固定收益、宝物账本与RNG，并继续正常在线约15秒，实际保存刷新后无遗留债务。该本机验收不代表所有手机或任意未来公式绝无卡顿。

后续新资源/宝物/阶段的必经检查：接入冻结来源或有界阶段适配，不能以0.1秒回放作为离线兜底；长时段查询/迭代数量必须受固定上限约束；异常需保留债务并可暂停重试；在线精度与Worker保存边界必须同时过门禁。

以下0.1.7.5及以前性能/路径记录均为历史。

## 发布版 0.1.7.5 验收（2026-10-05）

- 开发manifest/Worker --check、sync-release逐文件/发布manifest/Worker检查通过；页面、配置和CSS缓存独立核对。
- release-0170（历史文件名，当前断言v0.1.7.5）、release-layout：82脚本语法、79共同脚本字节一致，调速/Alt+S/公式调试/UI测试入口移除、速度×1、手机320/390/430及桌面1280、低进度布局/缩放/高窗口、旧档和真实file启动。
- WIS_GAME_ROOT指向发布版：offline-worker-retry-span；WIS_WORKER_RETRY=1和WIS_HIGH_INTERVAL_PLAYER=1运行martial-high-worker，真实重试Worker与本地全游戏状态/保存/债务一致。
- WIS_YIELD_DELAY=100运行offline-worker-slow-player-browser：原08:07档全部592.49秒，默认30秒保护触发一次重启后连续提交，最终idle/pending=0；持续在线15秒并保存重载，无遗留债务，原文件未改。
- WIS_PLAYWRIGHT为已有依赖，TEMP/TMP/FIXED_RESULTS均在E盘，任务临时目录已清理。未验收实体手机/任意负载；Schema71/结算规则1/saveKey保持。已同步本地发布版，未推送部署。

## 慢调度重试停滞（2026-10-05）

- node tests/offline-worker-retry-span.test.cjs：修复前红灯；Worker入口默认不裁段，第1/2次重试向真实headless planner传30/3秒上限，规划前生效、状态只读。
- node tests/offline-worker-retry-accuracy.test.cjs：原08:07档60秒，30/3秒段对照关闭批算的正式回放；资源、毛收入、Y新增收益、事件/RNG/时钟检查。30秒段最大相对差0.0002073%，3秒段一致。
- WIS_WORKER_RETRY=1 WIS_HIGH_INTERVAL_PLAYER=1运行martial-high-worker.test.cjs：真实Worker与相同重试规划上限的本地结果一致，ACK/保存/债务完整。
- tests/offline-worker-slow-player-browser.test.cjs：真实file页面和真实时钟导入原08:07档、点击重试、完成后持续在线15秒、保存重载；WIS_YIELD_DELAY=100仅在测试Worker延长协作让出。旧发布版约90秒后停于原592.49秒，开发修复后一次重启缩至30秒段并全部结清。WIS_MARTIAL_PERF_SAVE可指定实际失败后保存的暂停档，该路径亦完成验收。WIS_GAME_ROOT可选开发或旧发布根目录；WIS_PLAYWRIGHT指向已有依赖，TEMP/TMP/FIXED_RESULTS使用E盘，临时诊断/派生暂停档验收后清理。
- offline-worker、offline-worker-owner、offline-worker-lifecycle-browser通过；manifest/Worker与改动脚本语法通过。未更改超时阈值、重试上限或保存字段；发布版尚未同步。

## 发布版 0.1.7.4 验收（2026-10-05）

- node tools/update-script-manifest.cjs --check、node tools/build-offline-worker.cjs --check、node tools/sync-release.cjs：开发与发布缓存、清单、Worker和发布转换逐文件校验通过；CSS缓存独立核对。
- tests/release-0170.test.cjs（历史文件名，当前断言v0.1.7.4）、release-layout：共同脚本字节相同，调速/Alt+S/公式调试/UI测试入口剔除、速度×1、手机/桌面缩放与高窗口、旧档重导出、实际file启动。
- WIS_GAME_ROOT指向发布版，运行origin-treasure-browser、martial-qi-power-goal、martial-high-worker（WIS_HIGH_INTERVAL_PLAYER=1）、martial-heart-browser（WIS_EXPECT_HIGH_INTERVAL=1）。本源320/390/1280显示、原挑战档完成、Worker/local状态一致、原武道档全部592.49秒结清及保存重载通过。本机Edge约16.4秒；不是手机或长期性能保证。
- WIS_PLAYWRIGHT使用现有安装，TEMP/TMP/FIXED_RESULTS均在E盘任务临时目录；验收后已清理。Schema71与结算规则1保持，原玩家文件不变；仅同步本地发布目录，未部署。

## 武道高值离线区间（2026-10-05）

- tests/martial-high-interval.test.cjs：完整生产装配，原08:07存档只读；默认60秒，WIS_PLAYER_FULL=1重试原档全部592.49秒。对照关闭区间的正式回放；仅允许列明的数值误差，离散字段/RNG精确匹配；Y按新增收益、毛收入独立验证，检查工作减少与债务结清。
- tests/martial-high-interval-guards.test.cjs：1e299/1e300/1e301/1e13237256资格，更高层变化和宝物事件仍为结构边界；休眠稀疏宝物账本保持、私有候选只读；Y误差origin的保存往返与非法输入拒绝。
- WIS_HIGH_INTERVAL_PLAYER=1 node tests/martial-high-worker.test.cjs：原高值档60秒真实Worker与本地完整游戏状态、RNG、收益、债务、保存一致，并断言实际采用区间。
- tests/martial-high-interval-edges.test.cjs：高值自动消耗、尚在变化的节奏倍率，均正确退回正式结算并与逐帧结果一致。
- WIS_EXPECT_HIGH_INTERVAL=1 node tests/martial-heart-browser.test.cjs：真实Edge导入原档、完整592.49秒、Worker检查点实际批算5632帧、恢复在线与保存重载；本机约12.8秒。完成自动关闭会清除UI会话统计，测试从实际Worker消息采集诊断。WIS_PLAYWRIGHT指定现有依赖，TEMP/TMP/FIXED_RESULTS使用E盘。
- 相关回归：martial-interval、cache、coordinates、gross、shadow、boundaries，online-partial-cadence（23场景），martial-integration；包含12挑战/自动化组合、宝物/等级事件、暂停保存续算、失败原子回滚。故障注入的暂停日志是预期结果。
- 最终Node原档71.69→49.55秒（另一轮67.51→48.13秒）；J/战力最大相对差0.000655%，Y新增收益0.000234%；所有受检误差低于既有预算。在线仍精确；不以Node数值代表浏览器/手机。发布版未同步。

## 高值武道离线炼心热点（2026-10-05）

- node tests/martial-heart-evaluation.test.cjs：固定配置需求不重复幂运算（优化前80次，优化后0次）；原公式精确一致、候选A/B/A、异常恢复、心/挑战变化、返回值隔离及替代算术后端。
- node tests/martial-heart-performance.test.cjs：原08:07存档，完整生产脚本装配，对照仅恢复旧炼心公式的参考实现。默认3轮30秒；WIS_PLAYER_FULL=1完整重放原592.49秒。逐字段比较游戏状态、RNG、瞬态和工作记账，仅排除宿主lastUpdateAt/timeLedger元数据；输入存档只读。三轮减少约23%–27%；整档90.08→66.46秒，不能将此Node计时冒充浏览器或手机速度。
- node tests/martial-heart-browser.test.cjs：原档真实Edge导入/暂停重试、完整债务、实际Worker、资源增加、在线恢复及保存重载；本机约17.4秒（含检查流程）。WIS_PLAYWRIGHT指向现有依赖，TEMP/TMP/FIXED_RESULTS均使用E盘临时目录；WIS_MARTIAL_PERF_SAVE可指定待验收存档。
- 相关回归通过：martial-domain、martial-increment-rounding、martial-integration、martial-interval-coordinates、martial-interval、evaluation-frame-reuse、online-partial-cadence、martial-high-worker；manifest/Worker --check通过。

本轮不扩展高值武道区间外推、不改0.1秒正式cadence/公式/RNG/债务/存档格式。高值逐帧限制仍存在；未做实体手机/长期压测/全量历史测试；发布版未同步。

## 本源宝物显示（2026-10-05）

运行node tests/origin-treasure-browser.test.cjs和node tests/immortal-milestones-browser.test.cjs。WIS_PLAYWRIGHT指向已安装Playwright；TEMP/TMP设E盘临时目录。新测试支持WIS_GAME_ROOT，加载真实样式，覆盖1280/390/320宽度、仙道与武道保留库存、未解锁隐藏、已解锁零库存可见；断言数量/倍率/来源/进度实际可见、暂停说明、无横向溢出及渲染不改存档。合成状态需含powerOne/scale2/scale3/scale5成就以打开真实宝物页。测试内临时替换回旧p标签可复现CSS隐藏失败，当前实现全部通过。manifest/Worker --check通过；本次未同步发布版。

## 气与力合完成条件（2026-10-05）

运行tests/martial-qi-power-goal.test.cjs（WIS_QI_POWER_SAVE可指定原07:39档）及martial-integration.test.cjs。验证取消完成比例限制、四项门槛仍有效、双方失衡兑换惩罚保留，原档完成/内三合/保存/防重复及不改资源RNG时钟。真实Edge已验证正常初始化后的Loop自动完成与页面目标说明；ui-state-boundary加载器默认挂起startInitialLoad，验证真实Loop前必须执行该初始化，不能把未初始化时的无推进当作失败。输入存档只读，所有临时输出放E盘。

## 0.1.7.3 发布验收（2026-10-05）

开发执行update-script-manifest.cjs --check和build-offline-worker.cjs --check；发布执行sync-release.cjs --check、release-0170.test.cjs（历史文件名，当前版本断言0.1.7.3）、release-layout.test.cjs。设置WIS_GAME_ROOT为发布版绝对路径后运行martial-high-browser、martial-high-worker、offline-calibration-browser、player-stall-import-browser；以上本轮全部通过。martial-high-browser现支持WIS_GAME_ROOT。TEMP/TMP/FIXED_RESULTS/WIS_TEST_RESULTS必须设E盘临时目录，浏览器使用WIS_PLAYWRIGHT指向已安装依赖。本次未重跑全量审计历史测试，已确认共享生产脚本逐字节一致、发布UI按既有转换规则生成。

## 已知审计问题回归（2026-10-05）

开发 build：dev-0.1.7.2-20261005-audit-fixes。版本0.1.7.2、Schema71、结算规则1不变。

- `node --test tests/import-transaction-storage.test.cjs`：导入实际写盘 receipt、跨标签 CAS、Quota/读取失败、后续保存及过期事务。
- `node tests/import-transaction-browser.test.cjs`：实际 Edge 的文件读取/取消/提交/回滚异常，验证 UI 提示和 hold 释放。
- `node tests/import-transaction-rebirth.test.cjs`：无限转生共享存储事务，覆盖写前/写后失败、状态恢复及后续普通保存。
- `node tests/online-partial-cadence.test.cjs`：以真实 Loop + Step 为参考，逐样本比较 dt、cadence、clock、策略和自动化资格，比较完整游戏状态/RNG；覆盖变速、补偿、事件、失败回滚、暂停重载和高反馈；挑战与补偿先后/恰重合时按实际Loop判断自动化资格，保留相同浮点运算顺序。队列归属 ledger 单独检查；Save 重读场景以正式 Save envelope 消除空数组的稀疏序列化差异，不删除玩法字段。
- `node --test tests/martial-increment-rounding.test.cjs`：四转换的新投入增量、无可表示增量不扣款、有效小增量与极高指数边界、手动/自动及 Save 重读；普通路径保持原运算顺序。

导入保护同时运行 import-recovery-lifecycle、save-conflict、save-conflict-browser、save-retry-browser、infinity-reset、ui-state-boundary。在线保护运行 online-segments、online-source-scope、budget-continuation、compiled-recovery、compiled-continuous、fixed-snapshot-macro、offline-segment-end、foreground-live-state、tree-v1-resource、tree-v1-integration；按现有工具重建 Worker 后运行 `node tools/test-settlement-engine.cjs` 和 `node tests/infinite-challenge-worker.test.cjs`。武道保护仍包括 martial-high-conversion、martial-high-worker、martial-high-browser、martial-domain 及区间/离线回归。

所有 TEMP/TMP、测试结果路径必须指向 E 盘。浏览器需要 WIS_PLAYWRIGHT 指向已安装 Playwright，使用 msedge。cow-materialization 的默认历史存档可能缺失；可显式用 WIS_FAULT_SAVE 指向仓库 tests/fixtures/infinity-real-high.json 验证代表性高值回滚，并注明未覆盖原历史样本。rules-authority 必须提供真正冻结的 WIS_DE_BASELINE，不能指向当前开发目录冒充参考。

## 武道高层转换（2026-10-05）

运行 tests/martial-high-conversion.test.cjs、tests/martial-high-worker.test.cjs、tests/martial-high-browser.test.cjs。覆盖截图(e^15)1e10及(e^4)1e10的四类转换、普通范围原结果、奖励倍率与指数、预览只读、扣款/入库/保存、真正不可表示增量不扣款；后台与本地完整状态对照、实际桌面1280/手机390按钮点击。浏览器需要WIS_PLAYWRIGHT，TEMP/TMP/FIXED_RESULTS均设E盘临时目录。保护回归为martial-domain（29项）、martial-engine、martial-development。上述本轮均通过；未做实体手机或长期性能测试。

## 离线校验累计上限修复（2026-10-05）

运行 offline-calibration-progress.test.cjs：原18:27存档 calibrationUsed=64、已提交16宏步、元晶8486→9076，确认签名变化仍执行4帧校验；验证新累计68可保存恢复、单次请求和整数溢出保护。运行 offline-calibration-browser.test.cjs：真实导入未修改原档、点击重试、完整15813.632秒债务归零、奖励入库、在线继续与保存重载。WIS_CALIBRATION_SAVE可指定该原档，WIS_PLAYWRIGHT指向已安装依赖；TEMP/TMP/FIXED_RESULTS/WIS_TEST_RESULTS均设E盘。

保护回归：local-discrete-guards、local-discrete-settlement-failure、offline-planner-budget、martial-legacy-calibration。旧“累计64即永久拒绝”断言由单次工作上限替代；普通回放预算及校验精度不变。offline-calibration-worker.test.cjs使用生产OfflineHeadless对照真实Worker全部剩余结算，两端使用完整生产脚本装配；历史benchmark加载器不作为本高进度档逐字节参照。

## 0.1.7.2 发布验收（2026-10-04）

运行 tools/update-script-manifest.cjs --check、tools/build-offline-worker.cjs --check、tools/sync-release.cjs --check。运行 tests/release-0170.test.cjs（历史文件名，版本断言现为0.1.7.2）及 tests/release-layout.test.cjs。设置 WIS_GAME_ROOT 为发布版绝对路径后，运行 tests/treasure-power-worker.test.cjs 和 tests/player-stall-import-browser.test.cjs；WIS_PLAYER_SAVE 指向原12:51玩家档，不使用重建进度副本。后者支持 WIS_GAME_ROOT，验证真实导入、Worker、全部积压完成、奖励入库、继续在线、自动关闭无弹窗与保存重载。TEMP/TMP/FIXED_RESULTS/WIS_TEST_RESULTS 均使用 E 盘临时目录，WIS_PLAYWRIGHT 使用已安装依赖。本轮以上全部通过；未执行实体手机或全量历史测试。

## 幂增长宝物高数量奖励（2026-10-04）

运行treasure-power-batch.test.cjs、treasure-power-worker.test.cjs、player-stall-import-browser.test.cjs。WIS_PLAYER_SAVE指向原12:51玩家档；浏览器需要WIS_PLAYWRIGHT，TEMP/TMP/FIXED_RESULTS/WIS_TEST_RESULTS均设E盘临时目录。涵盖五类幂宝物独立BigInt参考、低位保留、封顶过渡、历史倍率、回滚、幂等、原档奖励实际入库；真实Worker/local全状态一致，真实文件导入后在线9.978+离线180秒完整完成并继续在线。测试接受自动关闭后completed变idle的正常终态。不是使用清进度修复副本。

online-treasure-recovery.test.cjs验证正常恢复与原档推进，以及人为非法负来源的保护性暂停/FIFO保留；online-treasure-recovery-browser.test.cjs仅在内存篡改一条来源为负值，验证错误提示与债务，原输入文件不变。这一纯在线测试使用本地恢复通道。保护回归：treasure-ledger-capacity、treasure-backlog-recovery、signed-ledger-recovery、offline-return-backlog、worker-loop-render。后三个旧账本测试的可选真实档要求Schema59，不能传入本轮Schema71档。

## 0.1.7.1 发布同步（2026-10-04）

`node tests/release-layout.test.cjs`复现战力3截图，断言发布版侧栏占满app-body高度、没有多余空轨道，覆盖1015×864、1280×1440、320/390手机和0.75样式缩放，同时确认低进度隐藏与爆墙后解锁。

`node tools/sync-release.cjs --check`验证正式资源同步/调试剔除/生成物。`node tests/release-0170.test.cjs`检查脚本一致性、手机界面、Alt+S、只读、旧档和真实file启动。将WIS_GAME_ROOT设为发布版绝对路径后运行infinity-expansion.test.cjs、infinity-expansion-worker.test.cjs、infinity-expansion-browser.test.cjs验证正式构建。TEMP/TMP/FIXED_RESULTS设E盘，WIS_PLAYWRIGHT使用已安装依赖；详细边界见docs/release-0.1.7.0-20261004.md。

## 无限强化扩展（2026-10-04 / Schema71）

运行 `node tests/infinity-expansion.test.cjs`、`node tests/infinity-expansion-worker.test.cjs`、`node tests/infinity-expansion-browser.test.cjs`。覆盖黑洞全量级实际需求、B5独立保留/次数/退款/快速入场、D5 G1实际树产出、D6叠加与批量、旧预测器债务预算、真实Worker与手机UI。其他保护回归和限制见 `docs/infinity-expansion-20261004.md`。浏览器用WIS_PLAYWRIGHT+msedge，TEMP/TMP指向E盘临时目录；WIS_UI_EVIDENCE可选保存截图。

# WIS Testing Guide

## 离线完成汇总开关（2026-10-04）

运行tests/offline-summary-preference-browser.test.cjs。真实Worker完成纯离线与混合任务，开启自动关闭时汇总show次数和数值toast次数均为0，关闭时保留汇总；检查设置即时生效、暂停窗口和其他错误通知。需要WIS_PLAYWRIGHT，TEMP/TMP设为E盘。旧的自动模式展示1.5秒再关闭的断言已不适用；offline-return-backlog-browser在手动模式验证混合汇总。

## 手机离线UI（2026-10-04）

运行tests/offline-mobile-ui.test.cjs；需要WIS_PLAYWRIGHT，WIS_RETURN_SAVE可指定含暂停恢复的存档，默认使用用户09:38导出档；TEMP/TMP及可选WIS_UI_RESULTS必须设为E盘。覆盖320～1280宽度、暂停关闭重开、真实触摸滚动和点击、深浅色、只读在线积压提示及清空、运行模态门禁。实体移动浏览器兼容性须另行验证。

## 离线回归与历史积压（2026-10-04）

运行 tests/offline-return-backlog.test.cjs 和 tests/offline-return-backlog-browser.test.cjs。浏览器需 WIS_PLAYWRIGHT、WIS_RETURN_SAVE（指向用户实际复现存档）；TEMP/TMP设置E盘目录。必须保留存档全部pendingContinuousTime，不能先清空旧在线/离线积压。覆盖FIFO来源/速度/补偿资格、零新增时间恢复、重复恢复、暂停保存重载、运行弹窗、混合来源完成汇总及真实Worker首次持久提交。长积压完整完成需另行明确验证，不可用首次提交冒充。详见 docs/offline-return-backlog-20261004.md。

## 真葛立恒挑战内奖励（2026-10-03）

运行 tests/true-graham-reward.test.cjs、true-graham-reward-worker.test.cjs、true-graham-reward-browser.test.cjs。覆盖全部挑战键、未获得成就的原规则、G64+、D4、跨里程碑及40阶批量费用、只读查询、保存重载；Worker/local比较完整游戏状态与RNG、结算完成及零债务；浏览器核对实际分母和只读渲染。浏览器需WIS_PLAYWRIGHT；TEMP/TMP设为E盘临时目录。相关保护测试为tree-late-rules、infinity-challenges、infinity-effects、infinity-reset、ui-state-boundary。

## 天人五衰软上限弱化（2026-10-02）

运行 tests/heavenly-softcap.test.cjs、heavenly-softcap-browser.test.cjs、heavenly-softcap-worker.test.cjs。检查逐段50%、未解除段100%、混合境界、空间震/成就/至净/同化/B3/E3弱化、特殊资源隔离、只读查询与存档、Worker/local完整状态对照。旧 third-step-settlement 不再断言不可弱化的40%下限；第三步测试其余资源/奖励/重置合同沿用。Schema68恢复任务重建过期预测缓存并保留债务与预算。

## 快速无限挑战（2026-10-02）

运行 tests/infinite-challenge.test.cjs、infinite-challenge-settlement.test.cjs、infinite-challenge-browser.test.cjs、infinite-challenge-worker.test.cjs。覆盖E4恢复、零TREE及正常收益、单次转生与完整重置、一证永证例外、旧奖励及退款档迁移、取消/退出、启动保存失败回滚、在线/恢复/离线正式产出跨5秒边界、进行中存档恢复、Worker/local完整状态/RNG/债务/存档对照。浏览器需要 WIS_PLAYWRIGHT。原 rapid-universe 四条命令作为当前测试别名保留。

## 仙道与量级成就回归（2026-10-02）

运行 tests/immortal-milestones.test.cjs、immortal-milestones-settlement.test.cjs、immortal-milestones-browser.test.cjs。覆盖新宝物来源、正式下一帧生效、固定输入、预测签名、奖励范围、未来无限盒子条件、重置与重选例外、旧档及真实浏览器保存。浏览器仍需 WIS_PLAYWRIGHT。Worker/local 完整状态对照由 offline-worker-engine.test.cjs 覆盖。详见 docs/immortal-milestones-20261002.md。

## 结算线程与在线精度回归（2026-09-30）

`node tools/test-settlement-engine.cjs` 执行本轮核心回归；加 `--browser` 执行真实 Edge 的动作分片、暂停/保存/重载/导入、file:// / HTTP Worker、强制线程卡死恢复与真实高值 24 小时/7 天结算。浏览器需要 `WIS_PLAYWRIGHT` 指向 Playwright。长离线必须检查 completed、零剩余债务与准确时钟，不能把 paused 当作通过。

在线精度对照：`tests/online-performance-baseline.cjs` 在五类输入逐步记录完整状态、RNG、时钟与账本哈希；`tests/online-baseline-compare.cjs` 对照修复前保存的 Sources/Integration 结果。`tests/online-edge-baseline.cjs` 单独运行实际 100ms 浏览器主循环和保存，输出耗时分位数、Long Task、渲染与债务趋势。短时基线不是长期不卡顿证明，计时值不能作为逐位数学等价证据。

`import-recovery-browser.cjs` 专门控制本地 runner 的 yieldToHost，因此明确使用 useWorker:false；生产 Worker 的同类生命周期由 `offline-worker-lifecycle-browser.test.cjs` 单独覆盖。恢复测试需覆盖保存失败不安装、持久 ACK 丢失不重复收益、旧 generation 不安装、无实际进度不重置重试配额，以及微步预算跨暂停/重载不清零。

当前核心清单为 20 项。`local-discrete-macro-reference.test.cjs --full-step` 分别报告正式 0.1 秒资源参考、完整 Step 参考与离线候选，使用分层坐标误差，并检查拆分/序列化恢复的一致性；`local-discrete-hidden-income.test.cjs` 覆盖后期真实 Mana/IP 两帧交替和正收益被库存表示吞没的边界。`local-discrete-settlement-failure.test.cjs` 验证校准成功后结算失败仍计费，成功仅计费一次。

微步预算仍为 4096 次回放；校准单次请求最多 64 帧，局部宏步实际固定校验 4 帧。calibrationUsed 是完整累计工作量，不再限制整个离线会话；校验失败仍暂停、保留债务和已发生工作计数，恢复不清零。`formulaFramesEvaluated`、`rateQueries` 分别记录建模与查询成本，不能把 `directWork` 当作总工作量。跨单帧/两帧算子需要重新校准；奇数尾段不得超额扣时。每次更改生产脚本后重新生成 Worker bundle，再执行 `--check`。

> 当前测试策略。长期工程约束见 `AGENTS.md`，当前版本事实见 `AGENT_CONTEXT.md`。
> 测试文件会演进：**只运行当前工作区真实存在的文件**，不要为了匹配本文而创建不存在的旧测试。

## 1. 总原则

1. 先跑修改直接相关的窄测试，再按风险扩大。
2. UI 文案/显示小改不要默认跑长离线；触碰 Online/Offline/Resource/Evaluation/RNG/Save 时必须扩大。
3. 性能问题先计数定位重复工作/错误执行路径，再优化；不凭一次 wall 微基准下结论。
4. 正确性优先比较完整序列化 state / Save / RNG / debt / clock，而不是只看几个资源。
5. Online 精度不允许用 Offline 近似替代。
6. 高层大数误差不要统一用资源百分比；结合内部规范坐标、阶段、事件和下游效果判断。
7. 不能执行的测试必须明确说明原因，不得写“全部通过”。
8. 已知 baseline failure 要区分“本次新增”与“修改前已存在”。

## 2. 当前建议测试分组

以下文件名来自最近开发工作区验证记录；执行前先确认文件存在。

### Core / Evaluation / Source

```text
tests/source-display.test.cjs
tests/source-process.test.cjs
tests/resource-group-map.test.cjs
tests/evaluation-frame-reuse.test.cjs
tests/highest-power-evaluation.test.cjs
tests/foreground-live-state.test.cjs
```

重点：A→B→A、异常恢复、provider 调用次数、candidate 隔离、RNG/持久 state 不变。

### Resource / ledger / Treasure

```text
tests/resource-contract.test.cjs
tests/finite-economy.test.cjs
tests/signed-ledger-recovery.test.cjs
tests/treasure-eta-offline-summary.test.cjs
```

涉及 high-geometric-batch、pending、RNG、offline treasure event 时增加真实高数值存档对照。

### Simulation / Offline / Recovery

近期常用：

```text
tests/compiled-recovery.test.cjs
tests/compiled-continuous.test.cjs
tests/offline-segment-end.test.cjs
tests/persistent-predictor.test.cjs
tests/fixed-snapshot-macro.test.cjs
tests/scale-kernel.test.cjs
tests/coupled-resource-kernel.test.cjs
tests/exported-recovery-resume.test.cjs
```

预算 continuation 相关若存在：

```text
tests/budget-continuation.test.cjs
```

检查：candidate prepare/install/accept、失败回滚、debt、clock、timeLedger、RNG、pause/reload、executor path。

### Integration / Exploration

近期关键：

```text
tests/continuous-adaptive.test.cjs
tests/exploration-preview-refresh.test.cjs
tests/exploration-hold-scheduler.test.cjs
```

以及当前 work-local cache / representational-cycle 专项测试（以工作区实际文件名为准）。

检查：

- actual / Preview 同规则；
- ONLINE_EXACT 不变；
- work-local cache 不跨 state/work；
- exact cycle fast-forward 的 logical accepted/rejected/endpoint 与旧算法严格一致；
- first paint / dirty snapshot / hidden/折叠语义；
- 长按中间 Preview=0、松开最终 Preview=1；
- Online cadence 在长按期间继续推进。

### UI / format

近期关键：

```text
tests/display-e-ee.test.cjs
tests/unified-large-exponent-display.test.cjs
tests/high-tier-resource-growth.test.cjs
tests/ui-state-boundary.test.cjs
tests/ui-render-performance.test.cjs
```

检查：

- 正负大指数边界；
- 所有玩家消费者统一中央 formatter；
- sign/layer/mag 与 serialize 不变；
- render/query 不写持久 state；
- UI 相对增长提示不新增正式求值。

## 3. 当前已知基线失败

最近验证中以下问题在相关修改前后均可复现，不应误报成当前任务回归：

已修复：`offline-step-policy` 的 plan/累计预算旧断言，以及 `import-recovery-lifecycle` 的事务装配和独立导入门控问题。当前两项通过，原始红灯记录仍属于 BASELINE_EXISTING_FAILURE。

1. `manual-penalty-live-online`：完整 suite 的 backlog 清空断言已有失败；此前手动 Mana / 曲线相关前置断言可通过。

如果当前任务直接涉及这些区域，应重新确认并决定是否单独修；否则在报告中列为 baseline debt。

## 4. 按修改类型选择验证

### 纯显示 / formatter

至少：

- 当前 formatter 边界测试；
- 受影响 UI 消费者；
- `BigNum.serialize` / Save 不变；
- `node --check`；
- 必要 browser smoke。

不需要长离线。

### UI 调度 / Preview

至少：

- UI state boundary；
- Preview dirty/first-paint；
- hidden/折叠/route/cancel；
- 完整 state / Save 只读；
- 真实浏览器 Timeline 或等价调度证据；
- 若涉及 hold：pointerup/cancel/hidden/disabled/异常清理和无残留 timer/rAF。

### Exploration / Integration

至少：

- fast/slow 真实状态；
- actual-only / preview-only / button；
- 完整 state / Save / Preview deepStrictEqual；
- evaluation、accepted/rejected、actual/logical counts；
- work-local cache 生命周期和异常恢复；
- ONLINE_EXACT MathPolicy 恢复。

严禁为了性能测试降低 tolerance 或用 Offline 近似。

### Online Loop / 时间账本

至少：

- 正常 0.1s cadence；
- pendingContinuousTime 起止与最大值；
- continuation generation 失效；
- offline barrier；
- totalElapsedSeconds / scale / reincarnation clocks；
- lastSettlement.at；
- pause/hidden/import/restore；
- RNG。

重型玩家动作要验证 MainLoop 没被长期饿死。

### Offline / Checkpoint / ResourceEvolution

至少：

- 正常 large-fixed / fixed-20s / compiled-micro；
- capability fail 回滚；
- temporary fallback 能退出；
- high-layer layer-transition vs same-layer 分类；
- directWork 累计但不作为 executor eligibility；
- pause/save/reload；
- 真实 debt / clock / RNG。

如果修改预算/恢复合同，增加真实 5h/24h/7d 有界测试，但不要每个小改都跑。

### Resource / 支付

至少：

- 非法/负/0/超大费用；
- signed terms；
- 特殊支付原子性；
- 同名资源隔离；
- explicit candidate 读写；
- snapshot 兼容。

### Save / import

至少：

- `Save.envelope → Save.prepare` round-trip；
- schema / rule version；
- recovery/debt/timeLedger；
- 导入失败不污染 live；
- 当前已知 import lifecycle baseline 与本次变化分离。

## 5. 真实存档 A/B 方法

涉及高层性能/数值时优先用真实合法存档，不只造合成极端状态。

要求：

- A/B 独立 clone；
- 相同归一化初态；
- RNG、Date/time、环境一致；
- 不复用上一轮已推进 state；
- 不挑最好看的单次结果；
- 保存原始计数/终态/日志；
- 区分“受控相同 state”与“真实启动后 state 已被正式尾部结算改变”。

当前高数值 Exploration/Online 审计主要使用过 2026-09-21 两份真实存档；若文件不在当前工作区，必须由用户重新提供，不能凭报告重建状态。

## 6. 长按探寻专项验收

修改 hold/Preview 调度时至少做：

### 5s / 10s 真实 hold

记录：

```text
完成探寻次数
Online 正式 step 数
totalElapsedSeconds 增量
pendingContinuousTime 起止/最大值
Preview 次数
render 次数
最大 action wall
pointerup 后新增探寻次数
pending timer / rAF 数
```

目标合同：

- hold 中间 Preview=0；
- 可见时松开最终 Preview=1；
- MainLoop 持续推进；
- pending 不持续堆积；
- pointerup 后无追加 action；
- 同次数、对齐在线时间后最终 state / Save / Preview 严格一致。

## 7. Exploration 表示精度 cycle 专项验收

若修改 `Integration.createAdaptiveWork` cycle 逻辑：

- 必须有真实 Edge/浏览器 fixture，不能只用 VM 浮点投影替代；
- 对 fast A、slow B/C 状态比较；
- final Mana / Preview / full state / Save 必须 deepStrictEqual；
- tolerance、full/half、endpoint、arc 最终合同不变；
- logical evaluations/accepted/rejected 与旧算法一致；
- actual evaluations 可以下降；
- UNKNOWN / 非同态周期必须回退原算法。

## 8. Offline 性能方法

当前不再用“600s固定百分比误差”作为唯一标准。

### 快速健全性

- 120s / 600s：检查路径和事务；
- 1h：检查 planner/executor 稳定性。

### 长离线专项

只有任务确实针对长离线时才跑：

```text
5h
24h
7d
```

给 wall 上限，超时记录已推进游戏时间、candidate/query/work density、debt，不无限等。

判断要结合：

- throughput；
- executor 分布；
- directWork / game-second；
- capability fail / micro 连续长度；
- 主要阶段/资源坐标；
- RNG/debt/clock/recovery。

7d 单次历史 wall 不是长期 SLA。

## 9. 性能定位计数

常用：

```text
evaluationStateCalls / Entries / Reuses
candidateCloneCount / COW / full clone
Effects providerCalls
Source provider/value calls
ResourceGroups.evaluate
FixedSources.query
Integration evaluations / accepted / rejected / slices
cycleFastForwardLogicalCycles
executor kind / capability fail
candidate prepare/install/accept
Treasure closure / Automation / BigNumbers
host yield / checkpoint
```

先看调用数/执行路径，再看 wall。

## 10. 完整状态检查

底层修改至少覆盖：

```text
joules
power
mana
immortalPower
xianForce
yuanForce
highestPower
Treasure stock / progress / pending
BigNumbers
challenge / achievement
RNG
elapsed clocks
timeLedger
compensation
offline debt / recovery
```

优先完整序列化/hash/deepStrictEqual。

## 11. Browser smoke

涉及 UI/装配时至少检查：

- 启动；
- actions / cultivation / treasure / big numbers / statistics；
- 折叠/展开；
- pointer/keyboard；
- 设置/自动化；
- import/export（如相关）；
- 无 JS 异常；
- navigation/render 不写持久 state。

首次 paint/Preview 时序问题必须使用真实浏览器 paint/timeline 证据，不能只读 DOM 后猜屏幕显示。

## 12. Script / syntax / build

修改 JS/CJS：

```text
node --check <modified files>
```

完整工作区如有工具：

```text
node tools/update-script-manifest.cjs --check
```

当前脚本快照为 71 项；数量不是永久合同，HTML 才是真源。

新增/移动脚本后检查：路径、重复、顺序、`?v=`/buildId、manifest 与 HTML、一致启动。CSS cache-busting 单独检查。

## 13. 发布版保护

默认发布版零变化。较大任务建议记录 SHA-256 before/after。

只有用户明确要求发布/同步时才允许改发布版。

## 14. 精简 ZIP

如果只有运行时 ZIP 而没有 tests/tools/docs：

- 可以做源码、装配、静态合同、语法检查；
- 不得声称运行完整测试；
- 不得把缺失测试解释为仓库删除；
- 完整验收回到正式开发工作区。

## 15. 无限层 Schema63 回归

运行 `node tools/test-infinity-regression.cjs`。37项定向套件当前全部通过（2026-09-22 导入交接修复后）。两项原基线失败的审计与修复说明见 `docs/import-recovery-handoff-20260922.md`；原 Infinity 35/37 记录不应解释为玩法回归。脚本不隐藏失败。

新增9项 infinity 测试覆盖迁移、清零/退款、公式、挑战、候选失效、三来源5秒边界、预测时间、真实高值档与浏览器UI。浏览器使用本机 Edge 和 `WIS_PLAYWRIGHT` 所指向的 Playwright 包；无环境时不能宣称浏览器通过。数值长期平衡/全路线数日离线性能尚未验证。

## 导入与策略专项

- `offline-step-policy` 按 continuous / compiled-micro / production-replay 区分 plan 外形，验证实际 prepare/install、TIME_DYNAMIC、数学策略恢复与累计 directWork，不再把 8192 当执行资格门槛。
- `import-recovery-lifecycle` 通过测试专用 helper 读取并执行 game.js 正式 begin/commit/rollbackImportTransaction 和恢复回调，不维护回调的第二份实现。主机时钟受控；13ms 原子 step 证明默认12ms切片可成功返回但仍留有offline barrier。
- 新回归要求导入无 settlement、完整元数据交接、显式开始后 clock 只扣一次，另测部分交接失败回滚、旧token、RNG/速度/补偿/来源顺序、paused/quiet/零债务与唯一当前真实高值夹具重复导入/保存重读。多状态边界为人工fixture，不称为真实多存档用户场景。
- 完整 bootstrap 浏览器补验见 `tests/import-recovery-browser.cjs`（需 WIS_PLAYWRIGHT）；验证旧 offline continuation 和 online scheduler 回调在重导入后无写回。

## 离线 running UI 首帧

运行 node tests/offline-running-ui.test.cjs；node tests/offline-running-ui-browser.cjs。后者使用完整game bootstrap与Edge CDP Paint事件，验证实际offline-progress-dialog绘制发生在running发布后、首个planner前。

设置 WIS_UI_BASELINE 为修复前运行时根目录可重跑完整状态A/B比较；固定时钟/RNG、同一归一初态，普通600s、真实高值资产600s、E2/E3动态路线与快速挑战边界10s、短离线0.2s。断言完整序列化state相同，包含资源、时间、RNG、补偿、挑战和runElapsed，不比较wall诊断指标。

同时运行37项Infinity回归、import-recovery-lifecycle、import-recovery-browser和treasure-eta-offline-summary。短离线完成仍静默；导入blocking仍等待玩家开始。新帧等待期间pause/abandon不能提交重计算。

## 0.1.6.0 验收

继续运行 `node tools/test-infinity-regression.cjs`（37项），另运行：

```text
node tests/v0160-unlock-settings.test.cjs
node tests/infinity-reset-automation.test.cjs
node tests/infinity-root-reset.test.cjs
node tests/v0160-browser.test.cjs
node tests/import-recovery-lifecycle.test.cjs
node tests/import-recovery-browser.cjs
node tests/offline-running-ui.test.cjs
node tests/offline-running-ui-browser.cjs
node tools/update-script-manifest.cjs
```

浏览器测试需要 `WIS_PLAYWRIGHT` 指向安装的 Playwright，并使用 msedge。
导入内部门控仍可观察 awaitingStart；玩家无需点击开始。断言 commit/handoff → running UI → paint → 正式 start，不要把 pending 导入或已暂停队列提前执行。
灵根测试以最新确认的成就规则为准：夺基中品；大乘可恢复3级强化和天灵根。不要再次断言一律重置为下品。
普通离线测试同时推进受控帧/定时器与真实 host task，以覆盖 MessageChannel 续算；只推进微任务会产生测试装配假死。

## A01–A08 + R01 修复验收（2026-09-22）

当前 build：dev-0.1.6.0-audit-fixes-20260922。原审计的“成功复现缺陷”结果保留为历史证据；以下项目内探针全部断言修复后的行为：

```powershell
node tests/audit-d4.test.cjs
node tests/audit-g1.test.cjs
$env:WIS_AUDIT_BATCH='all'
node tests/audit-ui-browser.cjs
node tests/audit-high-value.test.cjs
node tests/audit-high-browser.cjs
node tools/test-infinity-regression.cjs
node tools/update-script-manifest.cjs --check
```

浏览器使用 WIS_PLAYWRIGHT + msedge；FIXED_RESULTS 可指定输出目录。UI 探针可将 WIS_AUDIT_BATCH 分别设为 U1、U2 验证两批。高值浏览器测试需要约 125 秒，采用仓库真实高值资产，只同步捕获时间，不更改资源；执行实际文件导入与原生产在线循环。高值模型测试执行 2000 次 0.1 秒 ONLINE_EXACT、禁止真实 RNG 消费并检查 Proxy 泄漏。

D4 19 项包括10秒已提交备份、非零 pending、零/微小水位差、80ms/1.5s 未采样前缀、2秒文件选择器、四种 rollback、成功 commit、旧 random 兼容，以及真实 worker 完成/放弃/补偿转换的 checkpoint 重载和失败回滚。G1 8 项包括 e/ee/eee15/eee16/真实高值、坐标误差、切换点单调、生产公式消费者、挑战末档与 C1 一次退款。UI 8 项包括2秒焦点、400ms/1s慢点击/600ms触控、购买/重置、四种竖屏 toast 和深色按钮四状态对比度。

最终验收：上述定向 35/35、主回归 37/37、71 JS 语法通过。已知债务：manual-penalty-live-online 的 backlog 断言仍在修复前后失败；exploration-preview-refresh 需要 WIS_PERFORMANCE_INITIAL，使用 tests/fixtures/infinity-real-high.json 时前后均在 missing first visible preview after paint task 失败，不能报告为通过。其余探索长按、宝物进度/账本/离线 ETA、自动化及 UI 状态边界专项通过。完整证据和本轮文件清单见 docs/audit-fixes-20260922.md。

## 挑战列表专项

运行 `node tests/challenge-unlock-filter.test.cjs` 与 `node tests/challenge-list-browser.test.cjs`，以及既有 Infinity 37 项回归。
覆盖 D3/E4 未购买时不可见且底层不能启动、购买后进入/退出、普通分组、有限上限与 repeatable 例外、筛选保存/重载、旧版误入未解锁挑战仍可退出。界面 360/1280 宽度不得横向溢出。版本保持0.1.6.0，Schema64。

## TREE 后期规则（2026-09-23）

运行 `node tests/tree-late-rules.test.cjs`、`node tests/tree-late-rules-browser.test.cjs`、`node tests/tree-refinement-browser.test.cjs`。覆盖 G64/65+ 容量需求、D4 降需求、40 阶批量费用与逐阶需求对照、旧 G65+ 进度迁移、独立 TREE 构造/衰减阈值、TREE3 封顶、D1-2 解锁后 TREE3→4→5、不同阶段 save/load、高阶 BigNum 进度和 320/390 像素 UI。再运行 Infinity 37 项主回归、A01–A08/R01 35 项保护、71 JS 语法及 manifest 检查。证据见 `docs/tree-late-rules-20260923.md`。

## 天人五衰与第三步（0.1.6.5 / Schema 65）

新增 `third-step.test.cjs`、`third-step-settlement.test.cjs`、`third-step-offline.test.cjs`、`third-step-recovery.test.cjs`（另以 `--origin` 验证零起点离线涅力）、`third-step-browser.cjs`。浏览器使用 WIS_PLAYWRIGHT + msedge。规则和验收边界见 docs/third-step-20260930.md。

37组相关回归36组通过；`treasure-eta-offline-summary.test.cjs` 的测试替身缺少 dialog.classList.contains，在修改前开发版同样失败。真实浏览器只读渲染、购买与第三步展示通过。

## 刷新与多页面存档保护（2026-10-01）

`node tests/save-conflict.test.cjs` 检查普通/Worker/回滚写入冲突、失败重试、主动导入/重置及坏档保留。`node tests/save-conflict-browser.test.cjs` 使用独立浏览器上下文和手机视窗，固定测试时钟，验证旧页面 pagehide 不覆盖新进度、持续提示、重载和正常刷新；需要 WIS_PLAYWRIGHT。两者不访问玩家的浏览器存档。

`node tests/save-retry-browser.test.cjs` 通过独立手机视窗和固定时钟注入首次写入失败，验证自动保存仍注册、离开事件保护、恢复存储后按原5秒回调成功保存、清除提示并刷新保留进度。需要 WIS_PLAYWRIGHT。


## 武道同步开发版（0.1.7.0 / Schema70）
运行 martial-development、martial-nonmartial-regression、martial-legacy-calibration 保护旧正式档、已知测试档导入、旧Schema69 predictor以及满校准预算的老模型。参见 docs/martial-sync-20261004.md 的通过/基线失败清单。实际页使用 martial-player-browser；界面使用 martial-ui-browser。其他 martial-* 测试覆盖域、区间、恢复、Worker及只读边界。
所有测试TEMP/TMP/FIXED_RESULTS指向E盘临时目录，WIS_PLAYWRIGHT指向已安装依赖。加载新增UI的Node DOM替身须包含martial.js；资源清单断言包含4个武道正式ID；正式key保持不变。非武道新增的零字段必须先断言为空，才能在与合并前fixture比较时剔除。

## 2026-11-01 旧能力预览夹具失配

exploration-preview-refresh.test.cjs 使用 helpers/preview-browser.cjs；该helper只替换 Save.read，当前启动已改读 Save.readWork。实测没有装入预期夹具，仙道和小天劫区hidden，所以等待tribulation预览超时。适配读取入口并断言已装入预期状态、能力解锁和可见后才能评价功能；本轮未修测试，不把它算作已确认玩家功能缺陷或已通过。证据见本批VERIFICATION.json。

## APK 0.2.0.0 定向复现

先加载 ../WIS-App-Toolchain/env.ps1（TEMP/TMP、npm/Gradle/Android 缓存全部在 E 盘）。

- node --test tests/native-platform.test.cjs tests/apk-version-save.test.cjs tests/release-output.test.cjs tests/import-transaction-storage.test.cjs tests/save-conflict.test.cjs tests/worker-loop-render.test.cjs
- 设置 WIS_PLAYWRIGHT 为 E 盘 Playwright 后，运行 tests/native-platform-browser.test.cjs、save-retry-browser.test.cjs、save-conflict-browser.test.cjs、import-transaction-browser.test.cjs。
- tests/release-0170.test.cjs 支持 WIS_RELEASE_ROOT 指向独立 --out；旧 fixture 带 model1/rule2 pending recovery 时应触发现行 CLOSED_RECOVERY_PROTECTED，不能以 APK 为由绕过。
- node tools/update-script-manifest.cjs --write；node tools/build-offline-worker.cjs；然后两者 --check。manifest 同时维护 styles.css 缓存标识。
- 发布转换 dry-run：node tools/sync-release.cjs --dry-run。--out/默认 --write 的一致性只在测试生成的隔离夹具执行，不能写实际发布版。
- APK：在 WIS-App 运行 npm run build-web，然后 android/gradlew.bat assembleDebug。真实 Android 输入文件、离线 Worker、导出分享、恢复及返回键必须区别于模拟插件测试记录。
## 本轮存档专项复跑

在开发真源目录运行，TEMP/TMP/WIS_STABILITY_RESULTS/FIXED_RESULTS均设为E盘证据目录，WIS_PLAYWRIGHT指向已安装Playwright目录。30文件列表保存在 `WIS-项目资源/save-compatibility-20261107/SUITE-FINAL.json`，使用 `node --test --test-concurrency=1 <列表>`；另跑 `tests/save-browser-commit.test.cjs`，以及 `node --test --test-name-pattern="oversized ranks survive actual save loading" tests/big-number-ranks.test.cjs`。

测试源码更新后应运行对应小范围回归；不要把中间失败日志或缺失原件的进程成功计入最终通过。最终去重规则和每项实际日志来源在RESULTS.json；exported-recovery的缺件必须是显式skip。原生浏览器存储测试的源只移除Worker专用window/document前导，使用同一生成公共源码，避免在Window里覆盖只读document。
