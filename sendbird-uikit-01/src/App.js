import SendbirdApp from '@sendbird/uikit-react/App';
import '@sendbird/uikit-react/dist/index.css';
import './App.css';

const APP_ID = '???';
const USER_ID = "demo user"

const App = () => {
  return (
      <div className="App">
          <SendbirdApp
              appId={APP_ID}
              userId={USER_ID}
          />
      </div>
  );
};

export default App;
