function get_extents(grid, x, y) {
  if (!grid || grid.length == 0) {
    return {};
  }

  let left = x;
  while (grid[y][left] != '#' && grid[y][left]) {
    left -= 1;
  }
  left += 1;

  let right = x;
  while (grid[y][right] != '#' && grid[y][right]) {
    right += 1;
  }
  right -= 1;

  let top = y;
  while (grid[top] && grid[top][x] != '#') {
    top -= 1;
  }
  top += 1;

  let bottom = y;
  while (grid[bottom] && grid[bottom][x] != '#') {
    bottom += 1;
  }
  bottom -= 1;

  return {
    left: left,
    right: right,
    top: top,
    bottom: bottom,
  }
}


class GridCell extends React.Component {
  render() {
    const {x, y, extents, rownum, colnum, mode} = this.props;

    const isActive = (
      (mode == 'down' && x == colnum && rownum >= extents.top && rownum <= extents.bottom) ||
        (mode == 'across' && y == rownum && colnum >= extents.left && colnum <= extents.right)
    );

    const isActiveCell = (x == colnum && y == rownum);

    var elemclass = "crossword-cell";
    if (this.props.last_row) {
      elemclass += " last-row";
    }
    if (this.props.last_col) {
      elemclass += " last-col";
    }
    if (isActiveCell) {
      elemclass += " active-cell";
    } else if (isActive) {
      elemclass += " active";
    }

    let numbercell;
    if (this.props.number) {
      numbercell = <div className="crossword-number">
        {this.props.number}
      </div>;
    } else {
      numbercell = null;
    }

    let contents;
    if (this.props.contents == ' ') {
      contents = '\u00A0';
    } else {
      contents = this.props.contents;
    }

    const this_ = this;
    const clickHandler = function() {
      this_.props.onClick(colnum, rownum);
    };

    const mouseEnterHandler = function() {
      this_.props.onMouseEnter(colnum, rownum);
    };

    const mouseLeaveHandler = function() {
      this_.props.onMouseLeave(colnum, rownum);
    };

    return (
      <div
        className={elemclass}
        onClick={clickHandler}
        onMouseEnter={mouseEnterHandler}
        onMouseLeave={mouseLeaveHandler}
      >
        {numbercell}
        {contents}
      </div>
    );
  }
}

class FilledCell extends React.Component {
  render() {
    return (
      <div className="crossword-cell filled" />
    )
  }
}

class GridRow extends React.Component {
  render() {
    const cells = [];
    const rowspec = this.props.rowspec;
    for (let idx = 0; idx < this.props.rowspec.length; idx += 1) {
      const elem = rowspec[idx];
      if (elem == '#') {
        cells.push(<FilledCell key={idx} />);
      } else {
        cells.push(
          <GridCell
            contents={elem}
            x={this.props.x}
            y={this.props.y}
            mode={this.props.mode}
            rownum={this.props.rownum}
            colnum={idx}
            extents={this.props.extents}
            number={this.props.nums[idx]}
            onClick={this.props.onCellClick}
            onMouseEnter={this.props.onCellMouseEnter}
            onMouseLeave={this.props.onCellMouseLeave}
            key={idx}
          />);
      }
    }

    return (
      <div className="crossword-row">
        {cells}
      </div>
    );
  }
}

class Grid extends React.Component {
  render() {
    const rows = [];
    for (let idx = 0; idx < this.props.rows.length; idx += 1) {

      const row = this.props.rows[idx];
      rows.push(
        <GridRow
          rowspec={row}
          rownum={idx}
          extents={this.props.extents}
          x={this.props.x}
          y={this.props.y}
          mode={this.props.mode}
          nums={this.props.numbers[idx]}
          onCellClick={this.props.onCellClick}
          onCellMouseEnter={this.props.onCellMouseEnter}
          onCellMouseLeave={this.props.onCellMouseLeave}
          key={idx}
        />
      );
    }

    return (
      <div className="crossword">
        {rows}
      </div>
    );
  }
}

class Clue extends React.Component {
  render() {
    let className = "clue";

    if (this.props.active) {
      className += ' active';
    }

    if (this.props.hilit) {
      className += ' hilit';
    }

    const this_ = this;
    const onClick = function() {
      this_.props.onClick(this_.props.idx);
    }

    return (
      <div className={className} onClick={onClick}>
        <div className="cluenum">
          {this.props.num}
        </div>. <div className="cluetext">{this.props.clue}</div>
      </div>
    )
  }
}

class ClueBox extends React.Component {
  process_clues(clues, dest, mode, offs) {
    for (let idx = 0; idx < clues.length; idx += 1) {
      const clue = clues[idx];
      const active = (mode == this.props.mode &&
                      clue.num == this.props.activeClue);
      const hilit = (this.props.hilightClues.length >= 2 && (
        (mode == 'across' && this.props.hilightClues[0] == clue.num)
        || (mode == 'down' && this.props.hilightClues[1] == clue.num)
      ));
      dest.push(
        <Clue
          num={clue.num}
          idx={idx + offs}
          clue={clue.clue}
          key={idx}
          active={active}
          hilit={hilit}
          onClick={this.props.onClueClick}
        />
      );
    }
  }

  render() {
    let across_clues = [];
    let down_clues = [];

    this.process_clues(this.props.across, across_clues, 'across', 0);
    this.process_clues(this.props.down, down_clues, 'down',
                       across_clues.length);

    return (
      <div className="cluebox">
        <h1>Across</h1>
        {across_clues}
        <h1>Down</h1>
        {down_clues}
      </div>)
  }
}

class Crossword extends React.Component {
  setGridChar(rows, c, x, y) {
    // TODO: make rows immutable
    let row = rows[y];
    let newRow = row.substr(0, x) + c + row.substr(x+1);
    rows[y] = newRow;
    return rows;
  }

  setchar(c, x, y) {
    let {rows} = this.state;
    this.setState({ rows: this.setGridChar(rows, c, x, y) });
  }

  sendchar(c, x, y) {
    $.post({
      url: "/data",
      data: {
        char: c,
        x: x,
        y: y,
      },
    });
  }

  enterChar(c, dir, moveFirst, stopAtBounds) {
    let {x, y, rows, mode} = this.state;

    let newX = x;
    let newY = y;

    if (mode === 'across') {
      newX = this.nextPos(dir, 0, stopAtBounds).x;
    } else {
      newY = this.nextPos(0, dir, stopAtBounds).y;
    }

    if (rows[newY] && rows[newY][newX] && rows[newY][newX] !== '#') {
      this.setState({ x: newX, y: newY });
    }

    // TODO: immutable stuff and whatnot.
    let row;
    let newRow;
    if (moveFirst && newX >= 0 && newY >= 0) {
      row = rows[newY];
      if (row[newX] != '#') {
        this.setchar(c, newX, newY);
        this.sendchar(c, newX, newY);
      }
    } else {
      this.setchar(c, x, y);
      this.sendchar(c, x, y);
    }
  }

  nextPos(dx, dy, stopAtBounds) {
    let {x, y, rows} = this.state;

    let cx = x;
    let cy = y;

    while (true) {
      const nx = cx + dx;
      const ny = cy + dy;

      if (!rows[ny] || !rows[ny][nx]) {
        // ran off the edge.
        return { x, y };
      }
      if (rows[ny] && rows[ny][nx] !== '#') {
        return { x: nx, y: ny };
      } else if (stopAtBounds) {
        return { x, y };
      }

      cx = nx;
      cy = ny;
    }
  }

  moveDir(dx, dy) {
    this.setState(this.nextPos(dx, dy));
  }

  doPoll() {
    let this_ = this;
    $.ajax({
      url: "/poll",
      data: {
        cursor: this_.state.cursor,
      },
      success: function(result) {
        let {rows} = this_.state;
        const messages = result.messages;
        let solved = this_.state.solved;
        let dismissed = this_.state.dismissed;
        let cursor = this_.state.cursor;
        for (const message of messages) {
          cursor = message.id;
          rows = this_.setGridChar(rows, message['char'], message.x, message.y);
          if (message.solved) {
            solved = true;
          } else {
            solved = false;
            dismissed = false;
          }
        }
        this_.setState({
          rows: rows,
          solved: solved,
          dismissed: dismissed,
          cursor: cursor,
        });

        this_.doPoll();
      },
      error: function() {
        setTimeout(
          this_.doPoll, 1000
        );
      }
    })
  }

  componentWillMount() {
    const this_ = this;
    $.ajax({
      url: "/grid",
      success: function(result) {
        this_.setState({
          rows: result.grid,
          numbers: result.numbering,
          clues: result.clues,
          title: result.title,
          author: result.author,
          notes: result.notes,
          solved: result.solved,
        });
        this_.doPoll();
      }
    });

    let keyPress = function(e) {
      if (e.metaKey || e.altKey || e.ctrlKey) {
        return;
      }
      let {x, y, rows, mode} = this_.state;
      if (e.key === 'ArrowUp') {
        this_.moveDir(0, -1);
        e.preventDefault();
      } else if (e.key === 'ArrowDown') {
        this_.moveDir(0, 1);
        e.preventDefault();
      } else if (e.key === 'ArrowLeft') {
        this_.moveDir(-1, 0);
        e.preventDefault();
      } else if (e.key === 'ArrowRight') {
        this_.moveDir(1, 0);
        e.preventDefault();
      } else if (e.key === '\\' || e.key == ' ') {
        if (mode === 'across') {
          this_.setState({ mode: 'down' });
        } else {
          this_.setState({ mode: 'across' });
        }
        e.preventDefault();
      } else if (e.key === 'Backspace') {
        if (rows[y][x] === ' ') {
          this_.enterChar(' ', -1, true, true);
        } else {
          this_.enterChar(' ', 0, true, true);
        }
      } else if (e.key === 'Delete') {
        this_.enterChar(' ', 0);
      } else if (e.key.length === 1) {
        const c = e.key.toUpperCase();
        this_.enterChar(c, 1);
      }
    }


    $("body").keydown(keyPress);
  }

  constructor(props) {
    super(props);
    this.state = {
      rows: [],
      numbers: [],
      clues: {
        across: [],
        down: [],
      },
      x: 0,
      y: 0,
      mode: 'across',
      hilightClues: [],
      mouseX: null,
      mouseY: null,
      title: null,
      author: null,
      notes: null,
      cursor: 0,
      solved: false,
      dismissed: false,
    };
  }

  render() {
    const extents = get_extents(this.state.rows, this.state.x, this.state.y);
    let this_ = this;

    const onCellClick = function(cx, cy) {
      let {x, y, mode} = this_.state;

      if (x == cx && y == cy) {
        // Clicking the already active cell
        if (mode == 'across') {
          this_.setState({'mode': 'down'});
        } else {
          this_.setState({'mode': 'across'});
        }

      }
      this_.setState({
        x: cx,
        y: cy,
      });
    };

    const onCellMouseEnter = function(cx, cy) {
      let {mouseX, mouseY} = this_.state;

      let mouseExtents = get_extents(this_.state.rows, cx, cy);

      this_.setState({
        mouseX: cx,
        mouseY: cy,
        hilightClues: [this_.state.numbers[cy][mouseExtents.left],
                       this_.state.numbers[mouseExtents.top][cx]],

      });
    };

    const onCellMouseLeave = function(cx, cy) {
      if (this_.state.mouseX === cx && this_.state.mouseY === cy) {
        this_.setState({
          mouseX: null,
          mouseY: null,
        });
      }
      this_.setState({
        hilightClues: []
      });
    };

    const onClueClick = function(idx) {
      let {clues} = this_.state;

      let clue;
      let mode;

      if (idx >= clues.across.length) {
        mode = 'down';
        clue = clues.down[idx - clues.across.length];
      } else {
        mode = 'across';
        clue = clues.across[idx];
      }

      this_.setState({
        mode: mode,
        x: clue.x,
        y: clue.y,
      });
    };

    let activeClue;
    if (Object.keys(extents).length > 0) {
      if (this.state.mode == 'across') {
        activeClue = this.state.numbers[this.state.y][extents.left];
      } else {
        activeClue = this.state.numbers[extents.top][this.state.x];
      }
    } else {
      activeClue = 0;
    }

    let dismiss = function() {
      this_.setState({
        dismissed: true,
      });
    }

    const show_banner = this.state.solved && !this.state.dismissed;

    let banner_class;
    if (show_banner) {
      banner_class = "solved";
    } else {
      banner_class = "solved hidden";
    }

    var solved_banner = (
      <div className={banner_class}>
        <div className="solved-inner">
          <div className="solved-header">
            Solved! :D :D
            <div className="dismiss" onClick={dismiss}>[X]</div>
          </div>
          <div>
            <img src="https://s-media-cache-ak0.pinimg.com/736x/56/4d/f0/564df0bc39a89086e15134b0bf82e9ae.jpg" />
          </div>
        </div>
      </div>
    );

    return (
      <div>
        <div className="puzzle-header">
          <h1 className="puzzle-title">{this.state.title}</h1>
          <h2 className="puzzle-author">{this.state.author}</h2>
        </div>
        {solved_banner}
        <Grid
          rows={this.state.rows}
          numbers={this.state.numbers}
          x={this.state.x}
          y={this.state.y}
          onCellClick={onCellClick}
          onCellMouseEnter={onCellMouseEnter}
          onCellMouseLeave={onCellMouseLeave}
          mode={this.state.mode}
          extents={extents}
        />
        <ClueBox
          across={this.state.clues.across}
          down={this.state.clues.down}
          mode={this.state.mode}
          activeClue={activeClue}
          onClueClick={onClueClick}
          hilightClues={this.state.hilightClues}
        />
        <div className="puzzle-notes">{this.state.notes}</div>
      </div>
    );
  }
}

const element = (
  <Crossword />
)

ReactDOM.render(
  element,
  document.getElementById('root')
);

console.log("Loaded");
