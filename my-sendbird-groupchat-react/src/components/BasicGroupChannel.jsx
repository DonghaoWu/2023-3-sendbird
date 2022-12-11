import React from 'react';
import { useState, useRef } from 'react';

const BasicGroupChannel = (props) => {
  const [state, updateState] = useState({
    applicationUsers: [], // 使用当前 app 的用户
    groupChannelMembers: [], // 当前 group 里面的用户
    currentlyJoinedChannel: null, // 当前加入的 channel
    messages: [], // 当前所有的信息
    channels: [], // 当前所有 group
    messageInputValue: '', // 当前输入的文本
    userNameInputValue: '', // 输入的用户名
    userIdInputValue: '', // 输入的用户 Id
    channelNameUpdateValue: '', // channel 的更新名
    settingUpUser: true, // 默认设置用户状态为 true
    file: null, // 未知
    messageToUpdate: null, // 未知
    messageCollection: null,
    loading: false, // ? 加载信息中
    error: false, // ? 发生错误
  });

  // useRef会在每次渲染时返回同一个ref对象，即返回的ref对象在组件的整个生命周期内保持不变。自建对象每次渲染时都建立一个新的。
  // ref对象的值发生改变之后，不会触发组件重新渲染。有一个窍门，把它的改变动作放到useState()之前。
  const stateRef = useRef();
  stateRef.current = state; // 为什么 current 值指向 state？

  const channelRef = useRef(); // 这是一个空值

  // 关于对所有 channel 的控制
  const channelHandlers = {
    // 两参数函数，往 state 中加入新的 channel
    onChannelsAdded: (context, channels) => {
      // 获取当前最新的 channels 列表，然后还有就有的 state 里面的 channels 列表去更新 state
      const updatedChannels = [...channels, ...stateRef.current.channels];
      // 估计加入了 ref 之后不是马上 rerender，而是有控制地改变 state，从而 re-render
      updateState({ ...stateRef.current, channels: updatedChannels });
    },
    onChannelsDeleted: (context, channels) => {
      // 个人猜想参数 channels 是一个全面的 array，里面每一个单位是一个 url
      // 以获得的最新的 channel 为标准，把 state 里面的旧 channel 信息过滤一遍
      const updatedChannels = stateRef.current.channels.filter((channel) => {
        return !channels.includes(channel.url);
      });
      updateState({ ...stateRef.current, channels: updatedChannels });
    },
    onChannelsUpdated: (context, channels) => {
      // 个人感觉这里的参数是一个不全面的 array，只提供被更新的个别 channel 信息
      const updatedChannels = stateRef.current.channels.map((channel) => {
        const updatedChannel = channels.find(
          (incommingChannel) => incommingChannel.url === channel.url
        );
        if (updatedChannel) {
          return updatedChannel;
        } else {
          return channel;
        }
      });
      updateState({ ...stateRef.current, channels: updatedChannels });
    },
  };

  // 关于对所以 messages 的控制
  const messageHandlers = {
    // 添加信息
    onMessagesAdded: (context, channel, messages) => {
      const updatedMessages = [...stateRef.current.messages, ...messages];
      updateState({ ...stateRef.current, messages: updatedMessages });
    },
    // 修改编辑信息
    onMessagesUpdated: (context, channel, messages) => {
      const updatedMessages = [...stateRef.current.messages];
      for (let i in messages) {
        // 逐条审视编辑更新后的信息
        const incomingMessage = messages[i];
        // 寻找对应的 message，并返回 index
        const indexOfExisting = stateRef.current.messages.findIndex(
          (message) => {
            return incomingMessage.reqId === message.reqId;
          }
        );

        // 找到了
        if (indexOfExisting !== -1) {
          updatedMessages[indexOfExisting] = incomingMessage;
        }
        // 如果是漏掉的信息，直接添加
        if (!incomingMessage.reqId) {
          updatedMessages.push(incomingMessage);
        }
      }
      updateState({ ...stateRef.current, messages: updatedMessages });
    },
    onMessagesDeleted: (context, channel, messageIds) => {
      // 根据返回的 ID 去过滤
      // 个人猜想返回的 messageIds 是一个 array，每一个单位是一个需要删除的 messageId
      const updatedMessages = stateRef.current.messages.filter((message) => {
        return !messageIds.includes(message.messageId);
      });
      updateState({ ...stateRef.current, messages: updatedMessages });
    },
    // 对单一 channel 的控制
    onChannelUpdated: (context, channel) => {},
    onChannelDeleted: (context, channelUrl) => {},
    onHugeGapDetected: () => {},
  };

  return <div>BasicGroupChannel</div>;
};

// function TextInputWithFocusButton() {
//   const inputEl = useRef(null);
//   const onButtonClick = () => {
//     // `current` 指向已挂载到 DOM 上的文本输入元素
//     inputEl.current.focus();
//   };
//   return (
//     <>
//       <input ref={inputEl} type="text" />
//       <button onClick={onButtonClick}>Focus the input</button>
//     </>
//   );
// }

export default BasicGroupChannel;
