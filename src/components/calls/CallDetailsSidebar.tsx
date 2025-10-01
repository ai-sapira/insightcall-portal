import React, { useState, useRef, useEffect } from 'react';
import { 
  Brain, 
  MessageSquare, 
  Activity, 
  Phone, 
  Play, 
  Pause, 
  Clock, 
  MapPin,
  User,
  Bot,
  X,
  CheckCircle,
  AlertCircle,
  Download
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback } from '../ui/avatar';
import CallActionsSection from './CallActionsSection';
import { CallTranscriptionChat } from './CallTranscriptionChat';
import { ChatMessage, VoiceCallDetailsClean } from '../../services/voiceCallsRealDataService';
import { translationService, TranslationResponse } from '../../services/translationService';

interface CallDetailsSidebarProps {
  call: VoiceCallDetailsClean;
  isOpen: boolean;
  onClose: () => void;
}

export const CallDetailsSidebar: React.FC<CallDetailsSidebarProps> = ({ 
  call, 
  isOpen, 
  onClose 
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedSummary, setTranslatedSummary] = useState(call.transcriptSummaryTranslated || call.transcriptSummary);

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'No disponible';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Fecha inválida';
      
      return new Intl.DateTimeFormat('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (error) {
      return 'Error en fecha';
    }
  };

  useEffect(() => {
    const translateSummary = async () => {
      if (!call.transcriptSummary) return;
      if (call.transcriptSummaryTranslated) {
        setTranslatedSummary(call.transcriptSummaryTranslated);
        return;
      }
      setIsTranslating(true);
      try {
        const result = await translationService.translateToSpanish(call.transcriptSummary);
        setTranslatedSummary(result.translatedText);
      } catch (error) {
        console.error('Error al traducir resumen:', error);
        setTranslatedSummary(call.transcriptSummary); // Fallback to original if translation fails
      } finally {
        setIsTranslating(false);
      }
    };

    translateSummary();
  }, [call.transcriptSummary, call.transcriptSummaryTranslated]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" 
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-[900px] bg-background shadow-2xl z-50 flex flex-col border-l">
        
        {/* Header minimalista */}
        <div className="flex-shrink-0 p-6 border-b bg-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <div>
                <h2 className="text-lg font-semibold">Análisis de Conversación</h2>
                <p className="text-sm text-muted-foreground font-mono">{call.conversationId}</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Métricas compactas */}
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-xl font-bold">{call.formattedDuration}</div>
              <div className="text-xs text-muted-foreground">Duración</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold">{call.totalMessages}</div>
              <div className="text-xs text-muted-foreground">Mensajes</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold">{call.tickets?.length || 0}</div>
              <div className="text-xs text-muted-foreground">Tickets</div>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-1">
                {call.callSuccessful ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                )}
              </div>
              <div className="text-xs text-muted-foreground">Estado</div>
            </div>
          </div>
        </div>

        {/* Tabs minimalistas */}
        <div className="flex-1 flex flex-col">
          <Tabs defaultValue="resumen" className="flex-1 flex flex-col">
            <div className="px-6 pt-6 pb-4 border-b">
              <TabsList className="grid w-full grid-cols-3 h-10">
                <TabsTrigger value="resumen" className="text-sm font-medium">
                  <Brain className="h-4 w-4 mr-2" />
                  Resumen
                </TabsTrigger>
                <TabsTrigger value="transcripcion" className="text-sm font-medium">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Transcripción
                </TabsTrigger>
                <TabsTrigger value="actions" className="text-sm font-medium">
                  <Activity className="h-4 w-4 mr-2" />
                  Acciones
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Contenido */}
            <div className="flex-1 overflow-hidden">
              
              {/* RESUMEN */}
              <TabsContent value="resumen" className="m-0 h-full overflow-hidden">
                <ScrollArea className="h-full max-h-[calc(100vh-200px)]">
                  <div className="p-6 pb-8 space-y-6">
                    
                    {/* Info básica */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Información de la llamada</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        
                        <div className="grid grid-cols-2 gap-4">
                          {/* Agente */}
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                <Bot className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">Agente</p>
                              <p className="text-sm text-muted-foreground">{call.agentId}</p>
                            </div>
                          </div>
                          
                          {/* Fecha */}
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                <Clock className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">Fecha y hora</p>
                              <p className="text-sm text-muted-foreground">{formatDate(call.startTime)}</p>
                            </div>
                          </div>
                        </div>

                        {/* Métricas */}
                        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                          <div className="text-center">
                            <div className="text-lg font-semibold text-blue-600">{call.agentMessages}</div>
                            <div className="text-xs text-muted-foreground">Agente</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-semibold text-green-600">{call.userMessages}</div>
                            <div className="text-xs text-muted-foreground">Usuario</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-semibold">{call.totalMessages}</div>
                            <div className="text-xs text-muted-foreground">Total</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Resumen */}
                    {call.transcriptSummary && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Resumen</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm leading-relaxed text-muted-foreground">
                            {isTranslating ? (
                              <span className="flex items-center">
                                <svg className="animate-spin h-4 w-4 text-blue-500 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Traduciendo...
                              </span>
                            ) : (
                              translatedSummary
                            )}
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    {/* Contacto */}
                    {call.caller_id && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Número de contacto</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                <Phone className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">Número de teléfono</p>
                              <p className="font-mono text-sm">{call.caller_id}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Audio */}
                    {call.ficheroLlamada && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Grabación de audio</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <audio
                              ref={audioRef}
                              src={call.ficheroLlamada}
                              preload="metadata"
                              onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
                              onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
                              onEnded={() => setIsPlaying(false)}
                            />
                            
                            <div className="flex items-center gap-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={togglePlayPause}
                                disabled={!duration}
                              >
                                {isPlaying ? (
                                  <Pause className="h-4 w-4" />
                                ) : (
                                  <Play className="h-4 w-4" />
                                )}
                              </Button>
                              
                              <div className="flex-1">
                                <Progress 
                                  value={duration ? (currentTime / duration) * 100 : 0} 
                                  className="h-2"
                                />
                                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                  <span>{formatTime(currentTime)}</span>
                                  <span>{formatTime(duration)}</span>
                                </div>
                              </div>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const link = document.createElement('a');
                                  link.href = call.ficheroLlamada!;
                                  link.download = `llamada-${call.segurneoCallId}.mp3`;
                                  link.click();
                                }}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            <div className="text-xs text-muted-foreground">
                              Formato: MP3 • Duración: {call.formattedDuration} • Disponible: 60 días
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* TRANSCRIPCIÓN */}
              <TabsContent value="transcripcion" className="m-0 h-full overflow-hidden">
                <ScrollArea className="h-full max-h-[calc(100vh-200px)]">
                  <div className="p-6 pb-8">
                    <CallTranscriptionChat 
                      messages={call.chatMessages || []}
                      callDuration={call.durationSeconds || 0}
                      conversationId={call.id || call.conversationId || 'N/A'}
                    />
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* ACCIONES */}
              <TabsContent value="actions" className="m-0 h-full overflow-hidden">
                <ScrollArea className="h-full max-h-[calc(100vh-200px)]">
                  <div className="p-6 pb-16">
                    <CallActionsSection 
                      aiAnalysis={call.aiAnalysis}
                      ticketsCreated={call.tickets?.length || 0}
                      ticketIds={call.tickets?.map(t => t.id) || []}
                    />
                  </div>
                </ScrollArea>
              </TabsContent>

            </div>
          </Tabs>
        </div>
      </div>
    </>
  );
}; 