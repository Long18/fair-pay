import { useTranslation } from 'react-i18next';
import { Button } from './button';
import { Globe, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu';

export const LanguageToggle = () => {
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;

  const changeLanguage = (lng: 'en' | 'vi') => {
    i18n.changeLanguage(lng);
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
          <span className="flex items-center gap-2 w-full">
            English
            {(currentLanguage === 'en' || currentLanguage.startsWith('en')) && (
              <Check className="h-4 w-4 ml-auto" />
            )}
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => changeLanguage('vi')}>
          <span className="flex items-center gap-2 w-full">
            Tiếng Việt
            {(currentLanguage === 'vi' || currentLanguage.startsWith('vi')) && (
              <Check className="h-4 w-4 ml-auto" />
            )}
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
