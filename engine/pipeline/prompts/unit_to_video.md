标题：将 source.md 的 Storyboard 转换为视频画面设计与字幕

输入：
- 已解析的 storyboard 场景列表（id, images[], narration, durationSec, transition）
- artworks 列表（以便选择裁切与镜头运动）

输出要点：
- 每场景的镜头运动建议（静帧/平移/缩放/淡入淡出）
- 屏幕文本（如必要，10 字内）与字幕分句（<= 2 行/条）
- 旁白节奏（每条 2-4 秒）

注意：
- 无密钥环境默认“静音 + 字幕”，若提供 TTS 则插入语音
- 保持 1920x1080，4:30 以内的小演示为宜

