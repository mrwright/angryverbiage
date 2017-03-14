import logging

import tornado.ioloop
import tornado.web
from tornado.concurrent import Future
from tornado import gen

import puz

import os

Handler = tornado.web.RequestHandler

global_id = 1

puzzle = puz.read('washpost.puz')
def pos(cell):
    return (cell % puzzle.width, cell // puzzle.width)

clues = puzzle.clue_numbering()
numbering = [
    [0] * puzzle.width for _ in range(puzzle.height)
]
for clue in clues.across + clues.down:
    x, y = pos(clue['cell'])
    numbering[y][x] = clue['num']


row_strs = []
for row in range(puzzle.height):
    cell = row * puzzle.width
    row = puzzle.fill[cell:cell + puzzle.width]
    row_str = ''.join(row.replace("-", " ").replace(".", "#"))
    row_strs.append(row_str)


def next_id():
    global global_id
    res = global_id
    global_id += 1
    return res

# This class is mostly copied from Tordado's chat example.
class MessageBuffer(object):
    def __init__(self):
        self.waiters = set()
        self.cache = []
        self.cache_size = 200

    def wait_for_messages(self, cursor=None):
        # Construct a Future to return to our caller.  This allows
        # wait_for_messages to be yielded from a coroutine even though
        # it is not a coroutine itself.  We will set the result of the
        # Future when results are available.
        result_future = Future()
        if cursor is not None:
            new_count = 0
            for msg in reversed(self.cache):
                if msg["id"] == cursor:
                    break
                new_count += 1
            if new_count:
                result_future.set_result(self.cache[-new_count:])
                return result_future
        self.waiters.add(result_future)
        return result_future

    def cancel_wait(self, future):
        self.waiters.remove(future)
        # Set an empty result to unblock any coroutines waiting.
        future.set_result([])

    def new_messages(self, messages):
        logging.info("Sending new message to %r listeners", len(self.waiters))
        for future in self.waiters:
            future.set_result(messages)
        self.waiters = set()
        self.cache.extend(messages)
        if len(self.cache) > self.cache_size:
            self.cache = self.cache[-self.cache_size:]

global_message_buffer = MessageBuffer()

class MainHandler(Handler):
    def get(self):
        self.render("index.html")

class PollUpdates(Handler):
    @gen.coroutine
    def get(self):
        cursor = int(self.get_argument('cursor', 0))
        self.future = global_message_buffer.wait_for_messages(cursor=cursor)
        messages = yield self.future
        if self.request.connection.stream.closed():
            return
        self.write({'messages': messages})

    def on_connection_close(self):
        global_message_buffer.cancel_wait(self.future)

class GridHandler(Handler):
    def get(self):
        global row_strs

        across_clues = []
        down_clues = []
        def process_clues(cluelist, dest):
            for clue in cluelist:
                x, y = pos(clue['cell'])
                dest.append({
                    'num': clue['num'],
                    'x': x,
                    'y': y,
                    'clue': clue['clue']
                })

        process_clues(clues.across, across_clues)
        process_clues(clues.down, down_clues)

        self.write({
            'grid': row_strs,
            'title': puzzle.title,
            'author': puzzle.author,
            'notes': puzzle.notes,
            'numbering': numbering,
            'clues': {
                'across': across_clues,
                'down': down_clues,
            },
        })

class DataHandler(Handler):
    def post(self):
        global row_strs
        char, x, y = (self.get_argument(x) for x in ("char", "x", "y"))
        x = int(x)
        y = int(y)

        assert y >= 0 and y <= len(row_strs)
        assert x >= 0 and x <= len(row_strs[y])
        assert row_strs[y][x] != '#'
        if not char:
            char = ' '
        row_strs[y] = row_strs[y][:x] + char + row_strs[y][x+1:]
        message = {
            'id': next_id(),
            'x': x,
            'y': y,
            'char': char,
        }
        global_message_buffer.new_messages([message])

def make_app():
    return tornado.web.Application([
        (r"/", MainHandler),
        (r"/poll", PollUpdates),
        (r"/grid", GridHandler),
        (r"/data", DataHandler),
    ],
    static_path=os.path.join(os.path.dirname(__file__), "static"),
    )

app = make_app()
app.listen(8888)
tornado.ioloop.IOLoop.current().start()
