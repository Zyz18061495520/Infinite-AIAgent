import deepseekIcon from '@/assets/models/deepseek.png'
import openaiIcon from '@/assets/models/openai.png'
import qwenIcon from '@/assets/models/qwen.png'
import ollamaIcon from '@/assets/models/ollama.png'

export const modelProviderOptions: { label: string, value: string, icon: string }[] = [
  {
    label: 'DeepSeek',
    value: 'deepseek',
    icon: deepseekIcon,
  },
  {
    label: 'OpenAI',
    value: 'openai',
    icon: openaiIcon,
  },
  {
    label: 'Qwen',
    value: 'qwen',
    icon: qwenIcon,
  },
  {
    label: 'Ollama',
    value: 'ollama',
    icon: ollamaIcon,
  },
]
