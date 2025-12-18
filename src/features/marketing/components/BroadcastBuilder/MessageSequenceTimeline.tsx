/**
 * Message Sequence Timeline
 * 
 * Visual timeline for building multi-message broadcast sequences.
 * Allows adding, editing, reordering, and deleting messages with delays.
 */

import { useState } from "react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Separator } from "@/shared/components/ui/separator";
import { Mail, MessageSquare, Plus, Trash2, Clock, GripVertical, Edit } from "lucide-react";
import { CampaignType, MarketingMessage } from "@/features/marketing/types";
import { InlineMessageEditor } from "./InlineMessageEditor";

interface MessageSequenceTimelineProps {
  broadcastType: CampaignType;
  messages: Partial<MarketingMessage>[];
  onMessagesChange: (messages: Partial<MarketingMessage>[]) => void;
}

export function MessageSequenceTimeline({ 
  broadcastType, 
  messages, 
  onMessagesChange 
}: MessageSequenceTimelineProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleAddMessage = (type: 'email' | 'sms') => {
    const newMessage: Partial<MarketingMessage> = {
      id: `temp-${Date.now()}`,
      message_type: type,
      sequence_order: messages.length,
      delay_minutes: messages.length === 0 ? 0 : 60, // First message immediate, others 1 hour default
      use_template: false,
      custom_subject: '',
      custom_body_text: '',
      custom_body_html: '',
    };
    
    onMessagesChange([...messages, newMessage]);
    setEditingIndex(messages.length);
  };

  const handleUpdateMessage = (index: number, updates: Partial<MarketingMessage>) => {
    const updated = [...messages];
    updated[index] = { ...updated[index], ...updates };
    onMessagesChange(updated);
  };

  const handleDeleteMessage = (index: number) => {
    const updated = messages.filter((_, i) => i !== index);
    // Reorder sequence
    updated.forEach((msg, i) => {
      msg.sequence_order = i;
    });
    onMessagesChange(updated);
    setEditingIndex(null);
  };

  const handleDelayChange = (index: number, value: string, unit: 'minutes' | 'hours' | 'days') => {
    const numValue = parseInt(value) || 0;
    let delayMinutes = 0;
    
    switch (unit) {
      case 'minutes':
        delayMinutes = numValue;
        break;
      case 'hours':
        delayMinutes = numValue * 60;
        break;
      case 'days':
        delayMinutes = numValue * 60 * 24;
        break;
    }
    
    handleUpdateMessage(index, { delay_minutes: delayMinutes });
  };

  const getDelayDisplay = (delayMinutes: number) => {
    if (delayMinutes === 0) return { value: 0, unit: 'minutes' as const };
    if (delayMinutes % (60 * 24) === 0) return { value: delayMinutes / (60 * 24), unit: 'days' as const };
    if (delayMinutes % 60 === 0) return { value: delayMinutes / 60, unit: 'hours' as const };
    return { value: delayMinutes, unit: 'minutes' as const };
  };

  // Auto-add messages based on broadcast type
  if (messages.length === 0 && (broadcastType === 'email' || broadcastType === 'sms')) {
    handleAddMessage(broadcastType as 'email' | 'sms');
  } else if (messages.length === 0 && broadcastType === 'both') {
    // Add email first, then SMS
    const emailMsg: Partial<MarketingMessage> = {
      id: `temp-${Date.now()}-email`,
      message_type: 'email',
      sequence_order: 0,
      delay_minutes: 0,
      use_template: false,
      custom_subject: '',
      custom_body_text: '',
      custom_body_html: '',
    };
    const smsMsg: Partial<MarketingMessage> = {
      id: `temp-${Date.now()}-sms`,
      message_type: 'sms',
      sequence_order: 1,
      delay_minutes: 60, // 1 hour after email
      use_template: false,
      custom_body_text: '',
    };
    onMessagesChange([emailMsg, smsMsg]);
  }

  return (
    <div className="space-y-4">
      {/* Messages List */}
      <div className="space-y-4">
        {messages.map((message, index) => {
          const isEditing = editingIndex === index;
          const delay = getDelayDisplay(message.delay_minutes || 0);
          
          return (
            <div key={message.id || index}>
              {/* Delay indicator (not for first message) */}
              {index > 0 && (
                <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
                  <div className="flex-1 border-l-2 border-dashed h-6 ml-5" />
                  <Clock className="h-4 w-4" />
                  <span>Wait</span>
                  <Input
                    type="number"
                    min="0"
                    value={delay.value}
                    onChange={(e) => handleDelayChange(index, e.target.value, delay.unit)}
                    className="w-20"
                  />
                  <Select
                    value={delay.unit}
                    onValueChange={(unit: any) => handleDelayChange(index, delay.value.toString(), unit)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minutes">Minutes</SelectItem>
                      <SelectItem value="hours">Hours</SelectItem>
                      <SelectItem value="days">Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Message Card */}
              <Card className={isEditing ? 'ring-2 ring-primary' : ''}>
                <CardContent className="p-4">
                  {!isEditing ? (
                    <div className="flex items-start gap-3">
                      <GripVertical className="h-5 w-5 text-muted-foreground cursor-move mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {message.message_type === 'email' ? (
                            <Mail className="h-4 w-4 text-blue-500" />
                          ) : (
                            <MessageSquare className="h-4 w-4 text-green-500" />
                          )}
                          <Badge variant="outline">
                            {message.message_type === 'email' ? 'Email' : 'SMS'}
                          </Badge>
                          {index === 0 && <Badge variant="secondary">First message</Badge>}
                        </div>
                        
                        {message.message_type === 'email' && message.custom_subject && (
                          <p className="font-medium mb-1 line-clamp-1">
                            Subject: {message.custom_subject}
                          </p>
                        )}
                        
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {message.custom_body_text || message.custom_body_html || 'No content yet'}
                        </p>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingIndex(index)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {messages.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteMessage(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <InlineMessageEditor
                      message={message}
                      onChange={(updates) => handleUpdateMessage(index, updates)}
                      onClose={() => setEditingIndex(null)}
                      isFirst={index === 0}
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      {/* Add Message Buttons (for sequence type) */}
      {(broadcastType === 'sequence' || messages.length === 0) && (
        <div className="flex gap-2 justify-center pt-4">
          <Button variant="outline" onClick={() => handleAddMessage('email')}>
            <Mail className="h-4 w-4 mr-2" />
            Add Email
          </Button>
          <Button variant="outline" onClick={() => handleAddMessage('sms')}>
            <MessageSquare className="h-4 w-4 mr-2" />
            Add SMS
          </Button>
        </div>
      )}

      {/* Sequence Summary */}
      {messages.length > 0 && (
        <div className="bg-muted/50 p-4 rounded-lg">
          <p className="text-sm font-medium">Sequence Summary</p>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span>{messages.length} message{messages.length !== 1 ? 's' : ''}</span>
            <Separator orientation="vertical" className="h-4" />
            <span>
              Total duration: {Math.floor(messages.reduce((sum, m) => sum + (m.delay_minutes || 0), 0) / (60 * 24))} days
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
