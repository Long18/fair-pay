import { useTranslation } from 'react-i18next';
import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './tooltip';
import { cn } from '@/lib/utils';

import { GlobeIcon, CheckIcon } from "@/components/ui/icons";
interface LanguageToggleProps {
  className?: string;
}

export const LanguageToggle = ({ className }: LanguageToggleProps) => {
  const { i18n, t } = useTranslation();
  const currentLanguage = i18n.language;
  const currentLangCode = currentLanguage.startsWith('vi') ? 'VI' : 'EN';

  const changeLanguage = (lng: 'en' | 'vi') => {
    i18n.changeLanguage(lng);
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "relative min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0",
                  className
                )}
                aria-label={t('settings.language')}
              >
                <GlobeIcon className="h-[1.2rem] w-[1.2rem] md:h-4 md:w-4" />
                <span className="hidden md:flex absolute -top-1 -right-1 text-[10px] font-semibold text-muted-foreground bg-muted/80 backdrop-blur-sm px-1.5 py-0.5 rounded-md border border-border/50">
                  {currentLangCode}
                </span>
                <span className="sr-only">{t('settings.language')}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[160px]">
              <DropdownMenuItem
                onClick={() => changeLanguage('en')}
                className="cursor-pointer"
              >
                <span className="flex items-center gap-2.5 w-full">
                  <div className="flex items-center justify-center w-5 h-5 rounded border border-border bg-background">
                    <span className="text-[10px] font-bold text-foreground">EN</span>
                  </div>
                  <span className="flex-1">{t('common.english')}</span>
                  {(currentLanguage === 'en' || currentLanguage.startsWith('en')) && (
                    <CheckIcon className="h-4 w-4 text-primary flex-shrink-0" />
                  )}
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => changeLanguage('vi')}
                className="cursor-pointer"
              >
                <span className="flex items-center gap-2.5 w-full">
                  <div className="flex items-center justify-center w-5 h-5 rounded border border-border bg-background">
                    <span className="text-[10px] font-bold text-foreground">VI</span>
                  </div>
                  <span className="flex-1">{t('common.vietnamese')}</span>
                  {(currentLanguage === 'vi' || currentLanguage.startsWith('vi')) && (
                    <CheckIcon className="h-4 w-4 text-primary flex-shrink-0" />
                  )}
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="hidden md:block">
          <p className="text-xs">{t('settings.language')}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
