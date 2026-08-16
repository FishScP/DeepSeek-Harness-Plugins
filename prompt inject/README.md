# prompt inject 鈥?閿氬畾鏍囧噯鐨勪笂涓嬫枃娉ㄥ叆鏀圭増锛坅nchored-standard-ci锛?

涓?[xiaobright/dsh-anchored-standard](https://github.com/xiaobright/dsh-anchored-standard) 鎻愪緵
**銆屼笂涓嬫枃娉ㄥ叆銆嶆敼鐗堥璁?*锛氫繚鎸佸叾銆岄杞己閿氬畾銆嶈璁★紙绗竴璇锋眰鍙毚闇?Minimal 鐪熷疄宸ュ叿瀵?
`bash` + `str_replace_editor`銆佸墺绂昏嚜鍔ㄤ笂涓嬫枃娉ㄥ叆锛夛紝鍦?*鏅嬪崌鍚庢寜瀵硅瘽杞瀹氭湡娉ㄥ叆
AGENTS.md / CLAUDE.md 宸ヤ綔鍖烘寚浠ゅ唴瀹?*锛屽苟閰嶅涓€涓?*瀵硅瘽宸ュ叿琛岀殑娉ㄥ叆棰戞閫夋嫨鍣?*銆?

> 瀹為獙鎬хぞ鍖洪」鐩紝闈?DeepSeek 瀹樻柟 preset銆?

## 鏍稿績鐩殑锛堣瑙ｅ喅浠€涔堥棶棰橈級

`dsh-anchored-standard` 鐨勯敋瀹氭満鍒惰棣栬疆杞ㄨ抗绋冲畾锛屼絾浠ｄ环鏄?**AGENTS.md 鍐呭涓嶅啀姣忚疆鑷姩娉ㄥ叆**
锛堝畼鏂?`standard` 棰勮姣忚疆娉ㄥ叆锛岄敋瀹氶璁炬敼涓恒€屾彁绀?+ 妯″瀷鑷璇诲彇銆嶏級銆傚疄娴嬩腑妯″瀷甯镐笉璇诲彇锛?
瀵艰嚧鐢ㄦ埛鐨勫叏灞€/宸ヤ綔鍖烘寚浠わ紙濡傦細涓枃鎬濈淮閾俱€佽鍒?瀹℃壒宸ヤ綔娴侊級鍦ㄩ敋瀹氭ā寮忎笅**鎸佺画澶辨晥**銆?

鏈」鐩湪涓嶇牬鍧忛杞敋瀹氱殑鍓嶆彁涓嬫仮澶嶆寚浠ら€佽揪锛?

| 闃舵 | 琛屼负 |
|---|---|
| 璇锋眰 #1锛堟湭鏅嬪崌锛?| 涓?anchored-standard 鐩稿悓锛氫粎 Minimal 宸ュ叿瀵癸紝**涓嶆敞鍏ヤ换浣曚笂涓嬫枃**锛堥敋瀹氫繚鐣欙級 |
| 鏅嬪崌鍚庯紙棣栨宸ュ叿璋冪敤鎴栭娆″洖澶嶅悗锛?| `context-injector` 鎸夋墍閫夋ā寮忔敞鍏?AGENTS.md 鍐呭锛堥绠楁埅鏂紝榛樿 4096 瀛楄妭锛?|
| 妯″紡鎺у埗 | 浜旀。锛?*姣?5 杞?/ 姣?11 杞?/ 姣?15 杞?/ 姣忔鍘嬬缉鍚庯紙鍚檵鍗囧悗锛岄粯璁わ級/ 涓嶆敞鍏?* 鈥斺€?GUI 涓嬫媺瀹炴椂鍙皟锛屼笅涓€娆℃敞鍏ョ敓鏁?|

**銆屼竴杞€嶈涔夛紙娑堟伅绾э級**锛氫竴鏉＄敤鎴锋寚浠よ涓€杞紱涓€娆℃ā鍨嬫枃鏈洖澶嶄篃璁颁竴杞紱
宸ュ叿璋冪敤涓棿娑堟伅**涓嶈鏁?*锛堜緥锛氭ā鍨嬪洖绛斾袱娆°€佹偍鍙戝嚭绗笁鏉℃寚浠ゅ悗 = 绗?5 杞?鈫?瑙﹀彂娉ㄥ叆锛夈€?

**銆屾瘡娆″帇缂╁悗銆嶈涔?*锛氭檵鍗囧悗娉ㄥ叆涓€娆★紱涔嬪悗姣忔涓婁笅鏂囧帇缂╋紙compaction/end锛夊悗閲嶆柊娉ㄥ叆涓€娆♀€斺€斾笉鎸夎疆娆¤鏁般€?

## 渚濊禆椤圭洰锛堝繀椤诲厛琛屽畨瑁咃級

- **[xiaobright/dsh-anchored-standard](https://github.com/xiaobright/dsh-anchored-standard)**锛圡IT锛?
  - 鎻愪緵鏈敼鐗堢殑鍩虹锛歚anchored-standard` 涓婚璁剧殑缁勮楠ㄦ灦銆乣tool-bootstrap` 鏅嬪崌鏈哄埗銆?
    鍏变韩妯″潡 `compaction-epoch.mjs`锛坋poch 鏅嬪崌鍒ゅ畾锛夌瓑锛?
  - **鏈」鐩殑 `preset/anchored-standard-ci/` 鏄?澧為噺 overlay"**锛屼笉鍚叾浠撳簱鏁翠綋鍐呭锛?
    瀹夎椤哄簭锛?*鍏堟寜渚濊禆浠撳簱 README 瀹夎 anchored-standard锛屽啀瀹夎鏈」鐩?*銆?
- 鍙€夛細`dsh-plugin-vision`锛堣瑙夊伐鍏凤級鈥斺€擿agent.cordis.yml` 涓?`residentTools` 宸蹭负鍏堕鐣欍€?

## 鏂囦欢娓呭崟涓庢潵婧愭爣娉?

| 鏂囦欢 | 鏉ユ簮 |
|---|---|
| `preset/anchored-standard-ci/agent.cordis.yml` | **鍩轰簬渚濊禆椤圭洰鏂囦欢淇敼**锛堟柊澧?context-injector 琛屻€乺esidentTools銆佷腑鏂囨敞閲婏級 |
| `preset/anchored-standard-ci/preset.yml` | 鏈」鐩紙鏄剧ず鍚嶏細閿氬畾鏍囧噯锛堜笂涓嬫枃娉ㄥ叆锛夛級 |
| `preset/anchored-standard-ci/context-injector.mjs` | **鏈」鐩師鍒?*锛堟寜瀵硅瘽杞娉ㄥ叆鎻掍欢锛?|
| `preset/anchored-standard-ci/tool-bootstrap.mjs` | **鍩轰簬渚濊禆椤圭洰鏂囦欢淇敼**锛堟柊澧?`residentTools` 閰嶇疆椤癸細鏅嬪崌鍚庡父椹婚澶栧伐鍏凤級 |
| `preset/anchored-standard-ci/compaction-epoch.mjs` | **鏉ヨ嚜渚濊禆椤圭洰**锛圡IT锛屾湭淇敼锛涜繍琛屼緷璧栵紝闅忓寘闄勫甫锛?|
| `test/context-injector.test.mjs` | 鏈」鐩師鍒涳紙15 涓祴璇曪細杞璁℃暟/瑕嗙洊鏂囦欢/compaction 閲嶇疆/瀹归敊锛?|
| `ci-control/` | 鏈」鐩師鍒涳紙娉ㄥ叆棰戞閫夋嫨鍣ㄩ潤鎬佸寘锛歨ost Remote 鏈嶅姟 + client 宸ュ叿琛?UI锛?|

## 瀹夎

### 1. 瀹夎渚濊禆

鎸?[dsh-anchored-standard README](https://github.com/xiaobright/dsh-anchored-standard) 瀹夎
`anchored-standard` 棰勮鍒?`$DSH_HOME/.agent-presets/anchored-standard`銆?

### 2. 瀹夎鏈璁?

灏?`preset/anchored-standard-ci` 澶嶅埗鍒?`$DSH_HOME/.agent-presets/anchored-standard-ci`锛?

```powershell
$target = Join-Path $env:USERPROFILE '.dsh\.agent-presets\anchored-standard-ci'
Copy-Item -Recurse -LiteralPath '.\preset\anchored-standard-ci' -Destination $target
```

### 3. 瀹夎娉ㄥ叆棰戞閫夋嫨鍣紙ci-control锛屽彲閫変絾鎺ㄨ崘锛?

鍙傜収 `dsh-usage-column` 鐨勬帴鍏ユā寮忥細

1. 鎶?`ci-control` 鐩綍澶嶅埗鍒?`$DSH_HOME\profiles\web\packages\ci-control`锛?
   骞跺湪 `$DSH_HOME\profiles\web\node_modules` 寤虹珛閾炬帴
   锛坄New-Item -ItemType Junction -Path ...\node_modules\ci-control -Target ...\packages\ci-control`锛夛紱
2. 鍦?`$DSH_HOME\profiles\web\cordis.patch.yml` 杩藉姞锛?

   ```yaml
   - insert:
       - id: ci-control
         name: ci-control
   ```

3. **閲嶅惎 DSH**锛坧rofile 灞傛敼鍔ㄩ渶閲嶅惎鍔犺浇 client bundle锛夈€?

### 4. 楠岃瘉

```sh
npm test            # 鎴?node --test test/  锛坈ontext-injector 鍗曞厓娴嬭瘯锛?
node --check preset/anchored-standard-ci/*.mjs ci-control/lib/*.js
```

## 浣跨敤

1. 鏂板缓绌虹櫧浼氳瘽锛岄璁鹃€夋嫨鍣ㄤ腑閫夋嫨 **閿氬畾鏍囧噯锛堜笂涓嬫枃娉ㄥ叆锛?*锛?
2. 浼氳瘽宸ュ叿琛屽彸绔嚭鐜?**`娉ㄥ叆妯″紡 鈻綻** 涓嬫媺锛堜粎璇ラ璁句細璇濇樉绀猴級锛?
   **姣忔鍘嬬缉鍚庯紙鍚檵鍗囧悗锛? 姣?5 杞?/ 姣?11 杞?/ 姣?15 杞?/ 涓嶆敞鍏?*锛?
3. 閫夋嫨鍗冲啓鍏?`$DSH_HOME/.context-injector.json`锛?*涓嬩竴娆℃敞鍏ョ敓鏁?*锛堟棤闇€閲嶅惎锛夛紱
4. 棣栬疆浠嶅彧鏈?`bash` + `str_replace_editor`锛涙檵鍗囧悗鎸夋墍閫夋ā寮忔敞鍏?AGENTS.md 鍐呭銆?

## 鏁呴殰鎺掓煡

- **娉ㄥ叆妯″紡閫夋嫨鍣ㄦ湭鍑虹幇**锛氶儴鍒嗘儏鍐典笅锛堝 DSH 閲嶅惎鍚庣殑灏辩华绐楀彛寮傚父銆佹祻瑙堝櫒
  bundle 缂撳瓨鏈洿鏂帮級锛岄€夋嫨鍣ㄥ彲鑳芥棤娉曡嚜鍔ㄦ媺璧封€斺€?*鎸?`Ctrl+R` 鍒锋柊椤甸潰鍗冲彲鎭㈠**
  锛堜粛涓嶅嚭鐜版椂鐢?`Ctrl+Shift+R` 寮哄埗鍒锋柊锛夛紱
- 纭褰撳墠浼氳瘽纭疄杩愯銆岄敋瀹氭爣鍑嗭紙涓婁笅鏂囨敞鍏ワ級銆嶉璁撅紙璇ラ€夋嫨鍣ㄤ粎姝ら璁炬樉绀猴級锛?
- 妫€鏌?`C:\Users\<鐢ㄦ埛>\.dsh\.context-injector.json` 鏄惁瀛樺湪锛屽唴瀹瑰簲涓?
  `{"mode":"turns","interval":5}`銆乣{"mode":"compaction"}` 鎴?`{"mode":"off"}`
  锛堟棫鏍煎紡 `{"interval":N}` 鎸?turns 瑙ｆ瀽锛夛紱缂哄け鏃舵寜 `agent.cordis.yml` 榛樿
  `mode: compaction` 鎵ц銆?

## 璁捐瑕佺偣

- **棣栬疆閿氬畾涓嶅Ε鍗?*锛歚context-injector` 鍙湪鏅嬪崌鍚庢敞鍏ワ紝鏅嬪崌鍓嶄笌 anchored-standard 瀹屽叏涓€鑷达紱
- **浜旀。妯″紡**锛?
  - `turns`锛氭瘡 `interval` 鏉℃秷鎭敞鍏ワ紙涓€鏉℃寚浠ゆ垨涓€娆℃ā鍨嬫枃鏈洖澶?涓€杞紱宸ュ叿璋冪敤涓棿娑堟伅涓嶈鏁帮級锛?
  - `compaction`锛堥粯璁わ級锛氭檵鍗囧悗娉ㄥ叆涓€娆★紝涔嬪悗姣忔涓婁笅鏂囧帇缂╁悗閲嶆柊娉ㄥ叆涓€娆★紱
  - `off`锛氫笉娉ㄥ叆锛?
- **瑕嗙洊鏂囦欢浼樺厛**锛歚$DSH_HOME/.context-injector.json` 瑕嗙洊 `agent.cordis.yml` 閰嶇疆
  锛堥潪娉曞€煎洖閫€閰嶇疆锛夛紱
- **瀹归敊**锛氭枃浠剁己澶?璇诲彇澶辫触/鎻掍欢寮傚父涓€寰嬭烦杩囨敞鍏ワ紝缁濅笉闃诲浼氳瘽锛?
- **GUI 灏辩华閲嶈瘯**锛氶噸鍚悗 host/杩炴帴瀛樺湪灏辩华绐楀彛锛岄€夋嫨鍣ㄨ嚜鍔ㄩ噸璇曠洿鑷冲嚭鐜帮紱
- **鍙€夎瑙夊伐鍏?*锛歚residentTools: [see_image, vision_set_key, vision_status]`
  浣挎檵鍗囧悗鐩綍鐩存帴鍖呭惈 dsh-plugin-vision 鐨勫伐鍏凤紙鍏?`dev_tool_search` 瑙ｉ攣锛夈€?

## 鍏煎鎬?

- 鐩爣锛欴eepSeek Harness锛?.1.0-rc.5+ 缁撴瀯锛宺c.6 profile 瀹炴祴閫氳繃锛夈€乄indows / Linux锛?
- 鏈満瀹炴祴妯″瀷 deepseek-v4-flash锛堥敋瀹氭晥鏋滃洜妯″瀷鑰屽紓锛屽弬瑙佷緷璧栦粨搴撶殑璇勬祴璇存槑锛夛紱
- `agent.cordis.yml` 涓?`bootstrapMaxTokens` 鏈惎鐢紙瑙勯伩棰勬瀯寤?profile 鐨?maxTokens 瑕嗙洊闂锛夈€?

## 鐗堟潈涓庤鍙?

- **MIT**锛堟湰椤圭洰鍘熷垱閮ㄥ垎锛夛紱
- `compaction-epoch.mjs` 涓?`agent.cordis.yml`/`tool-bootstrap.mjs` 鐨勪慨鏀瑰熀绾?
  鏉ヨ嚜 [xiaobright/dsh-anchored-standard](https://github.com/xiaobright/dsh-anchored-standard)锛圡IT锛夛紝
  鍘熷 DeepSeek 鐗堟潈涓庤鍙０鏄庤璇ヤ粨搴?`NOTICE`锛涜閬靛畧鍏惰鍙潯娆俱€?
