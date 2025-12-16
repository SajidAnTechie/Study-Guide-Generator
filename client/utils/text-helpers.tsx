import { Shield, Database, Globe, Cloud, FileText } from "lucide-react";

export const emphasizeKeywords = (text: string) => {
    const patterns = [
        /(aws|ec2|s3|lambda|cloudfront|rds|dynamodb|aurora|vpc|subnet|route|elb|alb|nlb|kms|iam|waf|shield|cost|optimi[sz]ation|security)/gi,
    ];
    let parts: React.ReactNode[] = [text];
    for (const rx of patterns) {
        const next: React.ReactNode[] = [];
        parts.forEach((p) => {
            if (typeof p !== 'string') {
                next.push(p);
                return;
            }
            let last = 0;
            let m: RegExpExecArray | null;
            while ((m = rx.exec(p))) {
                const [match] = m;
                const start = m.index;
                if (start > last) next.push(p.slice(last, start));
                next.push(
                    <span className="font-semibold text-blue-700" key={`${match}-${start}`}>
                        {match}
                    </span>
                );
                last = start + match.length;
            }
            if (last < p.length) next.push(p.slice(last));
        });
        parts = next;
    }
    return parts;
};

export const getCategoryIcon = (title: string) => {
    const t = title.toLowerCase();
    if (/(security|iam|kms|guardduty|shield|waf|encryption)/i.test(t))
        return <Shield className="w-4 h-4 text-red-500" />;
    if (/(database|rds|dynamodb|aurora|redshift|opensearch)/i.test(t))
        return <Database className="w-4 h-4 text-emerald-600" />;
    if (/(network|vpc|subnet|route|gateway|load balancer|alb|nlb)/i.test(t))
        return <Globe className="w-4 h-4 text-indigo-600" />;
    if (/(cloud|aws|ec2|lambda|compute|s3|storage)/i.test(t))
        return <Cloud className="w-4 h-4 text-blue-600" />;
    return <FileText className="w-4 h-4 text-gray-500" />;
};

export const getPointIcon = (text: string): string => {
    const t = text.toLowerCase();
    if (/(security|iam|kms|encryption|policy|permission)/.test(t)) return '🔒';
    if (/(cost|price|optimi|savings|budget)/.test(t)) return '💸';
    if (/(database|rds|dynamo|aurora|sql|nosql)/.test(t)) return '🗄️';
    if (/(network|vpc|subnet|gateway|route|cidr)/.test(t)) return '🌐';
    if (/(aws|cloud|ec2|s3|lambda)/.test(t)) return '☁️';
    return '✅';
};
