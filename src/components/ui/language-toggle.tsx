import { useTranslation } from 'react-i18next';
import { Button } from './button';
import { Globe, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { setLocalSettings } from '@/lib/local-settings';

export const LanguageToggle = () => {
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;

  const changeLanguage = async (lng: 'en' | 'vi') => {
    try {
      await i18n.changeLanguage(lng);
      setLocalSettings({ language: lng });
      
      // Force a re-render by updating a key in localStorage that i18n watches
      localStorage.setItem('i18nextLng', lng);
      
      // Reload page to ensure all components update
      window.location.reload();
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Globe className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Toggle language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => changeLanguage('en')}>
          <span className="flex items-center gap-2">
            English
            {currentLanguage === 'en' && <Check className="h-4 w-4" />}
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => changeLanguage('vi')}>
          <span className="flex items-center gap-2">
            Tiếng Việt
            {currentLanguage === 'vi' && <Check className="h-4 w-4" />}
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
