import React from 'react';
import { Provider } from 'react-redux';
import { bindActionCreators } from 'redux';
import { getMessageById } from '../../data/data';
import { MessageModel } from '../../models/message';
import { getMessageQueue } from '../../session';
import { ConversationController } from '../../session/conversations';
import { MessageController } from '../../session/messages';
import { OpenGroupMessage } from '../../session/messages/outgoing';
import { RawMessage } from '../../session/types';
import { UserUtils } from '../../session/utils';
import { createStore } from '../../state/createStore';
import { actions as conversationActions } from '../../state/ducks/conversations';
import { actions as userActions } from '../../state/ducks/user';
import { SmartLeftPane } from '../../state/smart/LeftPane';
import { SmartSessionConversation } from '../../state/smart/SessionConversation';
import { makeLookup } from '../../util';
import {
  SessionSettingCategory,
  SmartSettingsView,
} from './settings/SessionSettings';

// Workaround: A react component's required properties are filtering up through connect()
//   https://github.com/DefinitelyTyped/DefinitelyTyped/issues/31363
const FilteredLeftPane = SmartLeftPane as any;
const FilteredSettingsView = SmartSettingsView as any;

type Props = {
  focusedSection: number;
};

type State = {
  isInitialLoadComplete: boolean;
  settingsCategory?: SessionSettingCategory;
  isExpired: boolean;
};

export class SessionInboxView extends React.Component<Props, State> {
  private store: any;

  constructor(props: any) {
    super(props);
    this.state = {
      isInitialLoadComplete: false,
      settingsCategory: undefined,
      isExpired: false,
    };

    this.showSessionSettingsCategory = this.showSessionSettingsCategory.bind(
      this
    );
    this.showSessionViewConversation = this.showSessionViewConversation.bind(
      this
    );

    void this.setupLeftPane();

    // not reactified yet. this is a callback called once we were able to check for expiration of this Session version
    window.extension.expired((expired: boolean) => {
      if (expired) {
        this.setState({
          isExpired: true,
        });
      }
    });
  }

  public render() {
    if (!this.state.isInitialLoadComplete) {
      return <></>;
    }

    const { settingsCategory } = this.state;

    const isSettingsView = settingsCategory !== undefined;
    return (
      <Provider store={this.store}>
        <div className="gutter">
          <div className="network-status-container" />
          {this.renderLeftPane()}
        </div>
        {isSettingsView
          ? this.renderSettings()
          : this.renderSessionConversation()}
      </Provider>
    );
  }

  private renderLeftPane() {
    return (
      <FilteredLeftPane
        showSessionSettingsCategory={this.showSessionSettingsCategory}
        showSessionViewConversation={this.showSessionViewConversation}
        settingsCategory={this.state.settingsCategory}
        isExpired={this.state.isExpired}
      />
    );
  }

  private renderSettings() {
    const category =
      this.state.settingsCategory || SessionSettingCategory.Appearance;

    return <FilteredSettingsView category={category} />;
  }

  private renderSessionConversation() {
    return (
      <div className="session-conversation">
        <SmartSessionConversation />
      </div>
    );
  }

  private async setupLeftPane() {
    // Here we set up a full redux store with initial state for our LeftPane Root
    const convoCollection = ConversationController.getInstance().getConversations();
    const conversations = convoCollection.map(
      (conversation: any) => conversation.cachedProps
    );

    const filledConversations = conversations.map((conv: any) => {
      return { ...conv, messages: [] };
    });

    const fullFilledConversations = await Promise.all(filledConversations);

    const initialState = {
      conversations: {
        conversationLookup: makeLookup(fullFilledConversations, 'id'),
      },
      user: {
        ourPrimary: window.storage.get('primaryDevicePubKey'),
        ourNumber: UserUtils.getOurPubKeyStrFromCache(),
        i18n: window.i18n,
      },
      section: {
        focusedSection: 1,
      },
    };

    this.store = createStore(initialState);
    window.inboxStore = this.store;

    // Enables our redux store to be updated by backbone events in the outside world
    const {
      messageExpired,
      messageAdded,
      messageChanged,
      messageDeleted,
      conversationReset,
    } = bindActionCreators(conversationActions, this.store.dispatch);
    window.actionsCreators = conversationActions;
    const { userChanged } = bindActionCreators(
      userActions,
      this.store.dispatch
    );

    window.Whisper.events.on('messageExpired', messageExpired);
    window.Whisper.events.on('messageChanged', messageChanged);
    window.Whisper.events.on('messageAdded', messageAdded);
    window.Whisper.events.on('messageDeleted', messageDeleted);
    window.Whisper.events.on('userChanged', userChanged);
    window.Whisper.events.on('conversationReset', conversationReset);

    this.setState({ isInitialLoadComplete: true });
  }

  private showSessionSettingsCategory(category: SessionSettingCategory) {
    this.setState({ settingsCategory: category });
  }

  private showSessionViewConversation() {
    this.setState({ settingsCategory: undefined });
  }
}
