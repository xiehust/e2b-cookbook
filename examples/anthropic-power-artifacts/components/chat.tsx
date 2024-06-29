import { useState, useEffect, FormEvent, useCallback, useRef } from 'react'
import { Terminal, Image as ImageIcon ,Trash2} from 'lucide-react'
import { Message } from 'ai/react'
import type {
  ChatRequestOptions,
  UseChatOptions,
} from '@ai-sdk/ui-utils';
import { Input } from '@/components/ui/input'


interface ImageData {
  id: string;
  base64: string;
}

export function Chat({
  messages,
  input,
  append,
  handleInputChange,
  handleSubmit,
  setInput,
  clearMessages
}: {
  messages: Message[],
  input: string,
  append: (e: any, options: ChatRequestOptions) => any,
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void,
  setInput: (e: any) => void,
  clearMessages: () => void
}) {
  const [images, setImages] = useState<ImageData[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // console.log('messages', messages);
  const latestMessageWithToolInvocation = [...messages].reverse().find(message => message.toolInvocations && message.toolInvocations.length > 0)
  const latestToolInvocation = latestMessageWithToolInvocation?.toolInvocations?.[0]
  const tools_text = latestToolInvocation ? latestToolInvocation.args.code : undefined;

  const customSubmit = useCallback(
    (event?: { preventDefault?: () => void },
      options: ChatRequestOptions = {},
    ) => {
      event?.preventDefault?.();
      if (!input && images.length === 0) return;

      const content = tools_text ? `Here is the code:\n${tools_text}, \n\n Here is the new user request:${input}` : input;


      append({
        content,
        role: 'user',
        data:options?.data  as string,
        createdAt: new Date(),
        },
        options
      );

      setInput('');
      setImages([]);
    },
    [input, append],
  );

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          setImages(prev => [...prev, { id: Date.now().toString(), base64: e.target?.result as string }]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handlePaste = (event: React.ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (e) => {
              setImages(prev => [...prev, { id: Date.now().toString(), base64: e.target?.result as string }]);
            };
            reader.readAsDataURL(blob);
          }
        }
      }
    }
  };

  const removeImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  return (
    <div className="flex-1 flex flex-col py-4 gap-4 max-h-full max-w-[800px] mx-auto justify-between">
      <div className="flex flex-col gap-2 overflow-y-auto max-h-full px-4 rounded-lg">
        {messages.map(message => (
          <div className={`py-2 px-4 shadow-sm whitespace-pre-wrap ${message.role !== 'user' ? 'bg-white' : 'bg-white/40'} rounded-lg border-b border-[#FFE7CC] font-serif`} key={message.id}>
            {message.content}
            {message.data && ( JSON.parse(message.data as string).map( (base64:string, index:number) => (
              <div key={index} className="mt-4 flex justify-start items-start border border-[#FFE7CC] rounded-md">
                <img 
                  src={base64} 
                  alt="Uploaded" 
                  className="mt-2 max-w-full h-auto rounded"
                />
              </div>
              ))
            )}  
            {message.toolInvocations && message.toolInvocations.length > 0 &&
              <div className="mt-4 flex justify-start items-start border border-[#FFE7CC] rounded-md">
                <div className="p-2 self-stretch border-r border-[#FFE7CC] bg-[#FFE7CC] w-14 flex items-center justify-center">
                  <Terminal strokeWidth={2} className="text-[#FF8800]" />
                </div>
                <div className="p-2 flex flex-col space-y-1 justify-start items-start min-w-[100px]">
                  {(message.toolInvocations[0].toolName === "runPython" || message.toolInvocations[0].toolName === "runJs") &&
                    <>
                      <span className="font-bold font-sans text-sm">{message.toolInvocations[0].args.title}</span>
                      <span className="font-sans text-sm">{message.toolInvocations[0].args.description}</span>
                    </>
                  }
                </div>
              </div>
            }
          </div>
        ))}
      </div>

      <form onSubmit={e => {
        customSubmit(e, {
          data: images.length ? JSON.stringify(images.map(img => img.base64)) : undefined
        })
      }}
        className="flex flex-col gap-2">
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {images.map((img) => (
              <div key={img.id} className="relative w-24 h-24">
                <img src={img.base64} alt="Uploaded" className="w-full h-full object-cover rounded" />
                <button
                  type="button"
                  onClick={() => removeImage(img.id)}
                  className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1"
                >
                  X
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={clearMessages}
            className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            <Trash2 size={24} />
          </button>
          <Input
            className="ring-0 flex-grow"
            placeholder="Ask Claude..."
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onPaste={handlePaste}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 bg-[#FFE7CC] rounded-lg"
          >
            <ImageIcon className="text-[#FF8800]" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            multiple
            className="hidden"
          />
        </div>
      </form>
    </div>
  )
}
