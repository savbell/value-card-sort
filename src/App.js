import LZString from 'lz-string';
import React, { useState, useEffect } from 'react';
import githubLogo from './github-logo.png';
import './App.css';
import values from './values';

const categories = [
  'Not important to me',
  'Somewhat important to me',
  'Important to me',
  'Very important to me',
  'Most important to me',
];

// Base62 encoding characters
const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

const encodeId = (num) => {
  let str = '';
  while (num > 0) {
    str = chars[num % 62] + str;
    num = Math.floor(num / 62);
  }
  return str || '0';
};

const decodeId = (str) => {
  let num = 0;
  for (let i = 0; i < str.length; i++) {
    num = num * 62 + chars.indexOf(str[i]);
  }
  return num;
};

function App() {
  const [unassignedValues, setUnassignedValues] = useState(values);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [categoryItems, setCategoryItems] = useState({
    'Not important to me': [],
    'Somewhat important to me': [],
    'Important to me': [],
    'Very important to me': [],
    'Most important to me': [],
  });

  const [draggedItem, setDraggedItem] = useState(null);
  const [generatedURL, setGeneratedURL] = useState('');
  const [copyMessage, setCopyMessage] = useState('');
  const [resetFlag, setResetFlag] = useState(false);

  const generateURL = () => {
    const categoryCodes = {
      'Not important to me': 'A',
      'Somewhat important to me': 'B',
      'Important to me': 'C',
      'Very important to me': 'D',
      'Most important to me': 'E',
    };

    const pairs = [];

    Object.keys(categoryItems).forEach((category) => {
      const categoryCode = categoryCodes[category];
      categoryItems[category].forEach((item) => {
        const encodedId = encodeId(item.id);
        pairs.push(`${encodedId}${categoryCode}`);
      });
    });

    const stateString = pairs.join(',');

    const compressedState = LZString.compressToEncodedURIComponent(stateString);

    const newURL = `${window.location.origin}${window.location.pathname}?data=${compressedState}`;

    setGeneratedURL(newURL);

    // Copy to clipboard without alert
    navigator.clipboard.writeText(newURL).then(() => {
      setCopyMessage('URL copied to clipboard!');
      setTimeout(() => {
        setCopyMessage('');
      }, 3000);
    });
  };

  const resetApp = () => {
    const confirmReset = window.confirm("Are you sure you want to reset? All your progress will be lost.");
    if (confirmReset) {
      // Perform the reset
      setUnassignedValues(values);
      setCategoryItems({
        'Not important to me': [],
        'Somewhat important to me': [],
        'Important to me': [],
        'Very important to me': [],
        'Most important to me': [],
      });
      setGeneratedURL('');
      setCopyMessage('');
      setDraggedItem(null);
      setResetFlag(!resetFlag);
      setCurrentIndex(0);
      // Clear URL query parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  useEffect(() => {
    const reverseCategoryCodes = {
      A: 'Not important to me',
      B: 'Somewhat important to me',
      C: 'Important to me',
      D: 'Very important to me',
      E: 'Most important to me',
    };

    const params = new URLSearchParams(window.location.search);
    const data = params.get('data');
    if (data) {
      try {
        const decompressedState = LZString.decompressFromEncodedURIComponent(data);

        const pairs = decompressedState.split(',');

        const newCategoryItems = {
          'Not important to me': [],
          'Somewhat important to me': [],
          'Important to me': [],
          'Very important to me': [],
          'Most important to me': [],
        };

        const assignedIds = new Set();

        pairs.forEach((pair) => {
          const idPart = pair.slice(0, -1);
          const categoryCode = pair.slice(-1);
          const id = decodeId(idPart);
          const category = reverseCategoryCodes[categoryCode];

          const item = values.find((value) => value.id === id);
          if (item) {
            newCategoryItems[category].push(item);
            assignedIds.add(id);
          }
        });

        setCategoryItems(newCategoryItems);

        // Update unassignedValues
        const newUnassignedValues = values.filter(
          (item) => !assignedIds.has(item.id)
        );
        setUnassignedValues(newUnassignedValues);
        setCurrentIndex(0); // Reset currentIndex after loading new state
      } catch (error) {
        console.error('Error parsing state from URL:', error);
      }
    } else {
      // Reset currentIndex when there's no data in URL
      setCurrentIndex(0);
    }
  }, [resetFlag]);

  const onDragStart = (e, item, sourceCategory) => {
    setDraggedItem({ item, sourceCategory });
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onDrop = (e, destinationCategory) => {
    e.preventDefault();
    if (!draggedItem) return;

    const { item, sourceCategory } = draggedItem;

    // Remove item from source
    if (sourceCategory === 'unassigned') {
      setUnassignedValues((prev) => {
        const index = prev.findIndex((i) => i === item);
        const newValues = prev.filter((i) => i !== item);
        // Adjust currentIndex if necessary
        if (currentIndex >= index && currentIndex > 0) {
          setCurrentIndex(currentIndex - 1);
        }
        return newValues;
      });
    } else {
      setCategoryItems((prev) => ({
        ...prev,
        [sourceCategory]: prev[sourceCategory].filter((i) => i !== item),
      }));
    }

    // Add item to destination
    if (destinationCategory === 'unassigned') {
      setUnassignedValues((prev) => {
        // Insert at currentIndex position
        const newValues = [...prev];
        newValues.splice(currentIndex, 0, item);
        return newValues;
      });
    } else {
      setCategoryItems((prev) => ({
        ...prev,
        [destinationCategory]: [item, ...prev[destinationCategory]],
      }));
    }

    setDraggedItem(null);
  };

  const onDragEnd = () => {
    setDraggedItem(null);
  };

  // Navigation functions
  const goToNextCard = () => {
    if (currentIndex < unassignedValues.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goToPreviousCard = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  return (
    <div className="App">
      <header>
        <h1>Value Card Sort</h1>
        <h2>
          Based on the work of W.R. Miller, J. C'de Baca, D.B. Matthews, and P.L. Wilbourne
        </h2>
        <p>
          Drag and drop the value cards into the categories below based on how
          important they are to you. You can rearrange them as needed. When 
          finished, click the "Generate URL" button to share your sorted values.
        </p>
      </header>
      <div className="top-card-container">
        <div
          className="top-card"
          onDragOver={onDragOver}
          onDrop={(e) => onDrop(e, 'unassigned')}
        >
          {unassignedValues.length > 0 && currentIndex >= 0 ? (
            <div
              key={unassignedValues[currentIndex].title}
              className="card"
              draggable
              onDragStart={(e) =>
                onDragStart(e, unassignedValues[currentIndex], 'unassigned')
              }
              onDragEnd={onDragEnd}
            >
              <h3>{unassignedValues[currentIndex].title}</h3>
              <p>{unassignedValues[currentIndex].description}</p>
            </div>
          ) : (
            <p>No more cards.</p>
          )}
        </div>
        <div className="navigation-buttons">
          <button
            className="prev-button"
            onClick={goToPreviousCard}
            disabled={currentIndex <= 0}
          >
            Previous
          </button>
          <button
            className="next-button"
            onClick={goToNextCard}
            disabled={currentIndex >= unassignedValues.length - 1}
          >
            Next
          </button>
        </div>
      </div>
      <div className="content">
        <div className="categories">
          {categories.map((category, index) => (
            <div
              key={category}
              className="category"
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, category)}
              style={{
                background: `linear-gradient(to bottom, rgba(255,255,255,0), rgba(0,0,0,0.05)), hsl(${
                  index * 60
                }, 100%, 95%)`,
              }}
            >
              <h2>{category}</h2>
              {categoryItems[category].map((item) => (
                <div
                  key={item.title}
                  className="card"
                  draggable
                  onDragStart={(e) => onDragStart(e, item, category)}
                  onDragEnd={onDragEnd}
                >
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="buttons">
          <button
            className="generate-url"
            onClick={generateURL}
            disabled={Object.values(categoryItems).every(
              (items) => items.length === 0
            )}
          >
            Generate URL
          </button>
          <button className="reset-button" onClick={resetApp}>
            Reset
          </button>
        </div>
        {copyMessage && <div className="copy-message">{copyMessage}</div>}
        {generatedURL && (
          <div className="generated-url">
            <p>Copy this URL to share your sorted values:</p>
            <input type="text" value={generatedURL} readOnly />
          </div>
        )}
      </div>
      <footer>
        <a
          href="https://github.com/savbell/value-card-sort"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img src={githubLogo} alt="GitHub" className="github-logo" />
        </a>
        <p>&copy; 2024 Sav Bell</p>
      </footer>
    </div>
  );
}

export default App;
