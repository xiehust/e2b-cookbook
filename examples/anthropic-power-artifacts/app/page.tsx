'use client'

import Image from 'next/image'
import { useChat } from 'ai/react'

import { Chat } from '@/components/chat'
import { SideView } from '@/components/side-view'

// Simulate user ID
const userID = 'dummy-user-id'

export default function Home() {
  const { messages, setMessages,input,setInput,append, handleInputChange, handleSubmit, data ,} = useChat({
    api: '/api/chat',
    body: { userID },
  })
  // console.log({ messages, data })

  // For simplicity, we care only about the latest message that has a tool invocation
  const latestMessageWithToolInvocation = [...messages].reverse().find(message => message.toolInvocations && message.toolInvocations.length > 0)
  // Get the latest tool invocation
  const latestToolInvocation = latestMessageWithToolInvocation?.toolInvocations?.[0]
  // console.log('latestToolInvocation:',latestToolInvocation)
  const last_message = messages.slice(-1)[0]
  const tools_text = last_message?.toolInvocations? last_message.toolInvocations[0].args.title+'\n'+last_message.toolInvocations[0].args.description+'\n'+last_message.toolInvocations[0].args.code : null;

  // console.log(messages);
  // if the last messsage has tools result, then append to the assistant content
  let new_messages = (tools_text && last_message?.role != 'user')? [...messages.slice(0,-1),{
    ...last_message,
    role:last_message?.role, 
    content:last_message?.content+'\n'+tools_text,
    toolInvocations:[]
  }]:messages;
  // if (tools_text && last_message?.role != 'user') {
  //   setMessages([...messages.slice(0,-1),{
  //     ...last_message,
  //     role:last_message?.role, 
  //     content:last_message?.content+'\n'+tools_text,
  //     // toolInvocations:[]
  //   }])
  // }
  // console.log('new_messages',new_messages);

  return (
    <main className="flex min-h-screen max-h-screen">
      <div className="fixed top-0 left-0 right-0 py-4 pl-8">
        <Image src="/logo.svg" alt="logo" width={30} height={30} />
      </div>
      <div className="flex-1 flex space-x-8 w-full pt-16 pb-8 px-4">
        <Chat
          messages={messages}
          append={append}
          input={input}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          setInput={setInput}
        />
        <SideView toolInvocation={latestToolInvocation} data={data} />
      </div>
    </main>
  )
}
