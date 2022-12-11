import React from 'react';
import { useState, useRef, useEffect } from 'react';
import {
  MessageFilter,
  MessageCollectionInitPolicy,
} from '@sendbird/chat/groupChannel';

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

  // 可能是一个按钮，可以直接跳转到页面底部，具体未清楚如何使用
  const scrollToBottom = (item, smooth) => {
    item?.scrollTo({
      top: item.scrollHeight,
      behavior: smooth,
    });
  };

  // 只有当 state.currentlyJoinedChannel 改变的时候才运行 scrollToBottom
  // 这里说的意思是如果一个用户新加入 channel，会自动引导至最低端
  // 那么 channelRef.current 的值是在哪里加入的呢？
  useEffect(() => {
    scrollToBottom(channelRef.current);
  }, [state.currentlyJoinedChannel]);

  // 另外一个 event listener
  useEffect(() => {
    scrollToBottom(channelRef.current, 'smooth');
  }, [state.messages]);

  // 处理 error，并加入到 state 中，在这里没有通过 ref 操作
  const onError = (error) => {
    updateState({ ...state, error: error.message });
    console.log(error.message);
  };

  // 关于 channel 的 api 操作，也是没有同过 ref 来操作
  // 使用 async 的原因是 updateState 是一个 async 动作？
  const handleJoinChannel = async (channelUrl) => {
    // 未知有什么作用
    if (state.messageCollection && state.messageCollection.dispose) {
      state.messageCollection?.dispose();
    }

    // 如果用户最近已经加入了该 channel，则不需要做任何动作
    // 这种情况主要是防止用户重复加入 channel
    if (state.currentlyJoinedChannel?.url === channelUrl) {
      return null;
    }

    const { channels } = state;
    // 不通过 ref，而是通过 loading 来决定是不是加载情况
    updateState({ ...state, loading: true });
    // 在所有 channel 中找出想要加入的 channel，所以所有 channel 包括已加入的还有未加入的
    const channel = channels.find((channel) => channel.url === channelUrl);

    // 定义 onCacheResult，主要是用来在 join channel 的时候改变 state，
    const onCacheResult = (err, messages) => {
      updateState({
        ...stateRef.current,
        currentlyJoinedChannel: channel,
        messages: messages.reverse(),
        loading: false,
      });
    };

    // 定义 onApiResult，未知作用，但代码跟上面 onCacheResult 一样
    const onApiResult = (err, messages) => {
      updateState({
        ...stateRef.current,
        currentlyJoinedChannel: channel,
        messages: messages.reverse(),
        loading: false,
      });
    };

    // 不知道 loadMessges 的作用
    const collection = loadMessages(
      channel, // 将要加入的 channel
      messageHandlers, // 上面已经定义的 messageHandlers
      onCacheResult,
      onApiResult
    );

    // 需要注意的是，现在还不知道 loadMessges 的作用，
    // 也不知道 messageCollection 的角色
    // 还有，loading 在设为 true 之后没有看到语句设定回 false
    updateState({ ...state, messageCollection: collection });
  };

  return <div>BasicGroupChannel</div>;
};

// 定义 loadMessages，可以看到它是在 component 之外的，也就是说是一个 helper function
// 不对 state 有影响，也不会re-render
const loadMessages = (channel, messageHandlers, onCacheResult, onApiResult) => {
  // MessageFilter 是 sendBird 自带的函数
  const messageFilter = new MessageFilter();
  // 有 1 个未知函数，分别是
  // createMessageCollection， 应该是 channel 自带的 sendbird 的函数
  const collection = channel.createMessageCollection({
    filter: messageFilter,
    startingPoint: Date.now(),
    limit: 100, // 这是在限制什么？
  });

  // setMessageCollectionHandler 是 sendbird 的另一个 api 函数
  collection.setMessageCollectionHandler(messageHandlers);

  // initialize / onCacheResult / onApiResult 都是 sendbird 的函数
  // MessageCollectionInitPolicy 直接引用 sendbird
  collection
    .initialize(MessageCollectionInitPolicy.CACHE_AND_REPLACE_BY_API)
    .onCacheResult(onCacheResult)
    .onApiResult(onApiResult);
  // 这个函数返回一个 collection 放在 state 的 messageCollection 里面，不知道作用是什么。
  return collection;
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
