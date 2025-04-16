import { useState, useEffect } from 'react';
import { Select, MenuItem, FormControl } from '@mui/material';

// Available languages with their flag icons
const languages = [
    { code: 'en', icon: '🇬🇧', name: 'English' },
    { code: 'chs', icon: '🇨🇳', name: '简体中文' },  
    { code: 'cht', icon: '🇨🇳', name: '繁體中文' }, 
    { code: 'deu', icon: '🇩🇪', name: 'Deutsch' }, 
    { code: 'esp', icon: '🇪🇸', name: 'Español' }, 
    { code: 'fr', icon: '🇫🇷', name: 'Français' },
    { code: 'jpn', icon: '🇯🇵', name: '日本語' }, 
    { code: 'pol', icon: '🇵🇱', name: 'Polski' },
    { code: 'por', icon: '🇧🇷', name: 'Português' }
];
  
/**
 * Standalone language selector component with URL integration
 * 
 * @param {Object} props Component props
 * @param {string} [props.defaultLanguage='en'] Default language code to use if none is in URL
 * @param {string} [props.paramName='language'] Name of the URL parameter to use for language
 * @param {Function} [props.onLanguageChange] Optional callback when language changes
 * @param {Object} [props.sx] Additional MUI styling to apply to the FormControl
 * @returns {React.Component} Language selector component
 */
export default function LanguageSelector({ 
  onLanguageChange,
  defaultLanguage = 'en', 
  paramName = 'lang',
  sx = {}
}) {
  // Get initial language from URL or use default
  const getInitialLanguage = () => {
    const queryParams = new URLSearchParams(window.location.search);
    const langParam = queryParams.get(paramName);
    // Validate that the language exists in our options
    return languages.some(lang => lang.code === langParam) ? langParam : defaultLanguage;
  };

  const [currentLang, setCurrentLang] = useState(getInitialLanguage);
  
  // Update language when URL changes (e.g., user navigates with browser controls)
  useEffect(() => {
    const handleUrlChange = () => {
      const newLang = getInitialLanguage();
      if (newLang !== currentLang) {
        setCurrentLang(newLang);
      }
    };

    // Listen for popstate events (back/forward browser navigation)
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, [currentLang, paramName]);

  const handleLanguageChange = (newLang) => {
    setCurrentLang(newLang);
    
    // Update the URL with the new language parameter
    const url = new URL(window.location.href);
    const params = new URLSearchParams(url.search);
    params.set(paramName, newLang);
    
    // Preserve the hash part (which contains your React Router routes)
    const newUrl = `${window.location.pathname}?${params}${window.location.hash}`;
    window.history.replaceState({}, '', newUrl);
    
    // Call the optional callback if provided
    if (onLanguageChange) {
      onLanguageChange(newLang);
    }
  };

  return (
    <FormControl size="small" sx={{ minWidth: 70, ...sx }}>
      <Select
        sx={{backgroundColor: 'white'}}
        value={currentLang}
        onChange={(e) => handleLanguageChange(e.target.value)}
        renderValue={(selected) => {
          const selectedLang = languages.find(lang => lang.code === selected);
          return <span style={{ fontSize: '1.2rem' }}>{selectedLang?.icon}</span>;
        }}
      >
        {languages.map(language => (
          <MenuItem key={language.code} value={language.code} sx={{backgroundColor: 'white'}}>
            <span style={{ fontSize: '1.2rem', marginRight: '8px' }}>{language.icon}</span>
            {language.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}