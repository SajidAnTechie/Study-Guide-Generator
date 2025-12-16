import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StudyGuideOption, StudyGuideType } from "@/types/study-guide";

interface StudyGuideTypeSelectorProps {
    options: StudyGuideOption[];
    selectedType: StudyGuideType | null;
    onTypeSelect: (type: StudyGuideType) => void;
}

export function StudyGuideTypeSelector({
    options,
    selectedType,
    onTypeSelect
}: StudyGuideTypeSelectorProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Choose Study Guide Type</CardTitle>
                <CardDescription>
                    Select the type of study material you'd like to generate.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 gap-3">
                    {options.map((option) => {
                        const Icon = option.icon;
                        return (
                            <button
                                key={option.id}
                                onClick={() => onTypeSelect(option.id)}
                                className={`p-4 rounded-lg border text-left transition-all ${selectedType === option.id
                                        ? 'border-blue-500 bg-blue-50 shadow-md'
                                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                    }`}
                            >
                                <div className="flex items-start space-x-3">
                                    <div className={`p-2 rounded-md ${option.color}`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-medium text-gray-900">{option.title}</h3>
                                        <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
