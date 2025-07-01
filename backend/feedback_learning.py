import json
from collections import defaultdict
import time
import os

def aggregate_feedback():
    feedback_path = 'backend/feedback.json'
    output_path = 'backend/chunk_feedback_scores.json'
    if not os.path.exists(feedback_path):
        print('No feedback.json found.')
        return
    with open(feedback_path, 'r') as f:
        feedbacks = json.load(f)
    chunk_scores = defaultdict(lambda: {'upvotes': 0, 'downvotes': 0, 'stars': [], 'net': 0})
    for fb in feedbacks:
        chunk_ids = fb.get('documentChunkIds') or []
        if not isinstance(chunk_ids, list):
            chunk_ids = [chunk_ids]
        for chunk_id in chunk_ids:
            if fb.get('rating') == 'up':
                chunk_scores[chunk_id]['upvotes'] += 1
                chunk_scores[chunk_id]['net'] += 1
            elif fb.get('rating') == 'down':
                chunk_scores[chunk_id]['downvotes'] += 1
                chunk_scores[chunk_id]['net'] -= 1
            if fb.get('stars'):
                chunk_scores[chunk_id]['stars'].append(fb['stars'])
    for chunk_id, stats in chunk_scores.items():
        if stats['stars']:
            stats['avg_stars'] = sum(stats['stars']) / len(stats['stars'])
        else:
            stats['avg_stars'] = None
    with open(output_path, 'w') as f:
        json.dump(chunk_scores, f, indent=2)
    print(f'Aggregated feedback written to {output_path}')

if __name__ == '__main__':
    aggregate_feedback() 